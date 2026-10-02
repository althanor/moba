import { describe, expect, it } from 'vitest';
import type { EffectNode, SimulationPort } from '../../src/contracts/index';
import { sessionId } from '../../src/foundation/index';
import { Session } from '../../src/application/index';
import { CapacityGuard, CombatFault } from '../../src/simulation/kernel/capacity-guard';
import { buildDefinitionIndex } from '../../src/simulation/kernel/definition-index';
import { RuntimeEntityIndex } from '../../src/simulation/runtime/entity-index';
import { createRoster } from '../../src/simulation/runtime/combat-state';
import { executeRoot } from '../../src/simulation/runtime/effect-executor';
import { EntityStore } from '../../src/simulation/kernel/entity-store';
import { contentId, harness } from '../fixtures/m2';

describe('corrupted executor paths (whitebox; never accepted content)', () => {
  it('counts duplicate Operation attempts while committing the identical opId only once', () => {
    const h = harness(), c = h.catalog, effect = contentId(c, 'damage_all');
    const corrupted = { ...c, document: { ...c.document, effects: c.document.effects.map(e => e.id === effect ? { ...e, node: { kind: 'repeat' as const, count: 2, child: { kind: 'damage' as const, formula: contentId(c, 'ten'), damageType: 'true' as const } } } : e) } };
    const store = new EntityStore(h.config.sessionId), entities = createRoster(h.config, store), guard = new CapacityGuard(c.certificate, h.config.profile, 1), kinds: string[] = [];
    guard.phase = 'P5'; guard.begin('duplicate-root', effect, contentId(c, 'fixture'));
    executeRoot({ catalog: corrupted, definitions: buildDefinitionIndex(corrupted), entityIndex: new RuntimeEntityIndex(h.config.sessionId, store, entities), entities, guard, nextInstance: () => 1, emit: fact => kinds.push(fact.kind) }, { rootId: 'duplicate-root', effect, producer: contentId(c, 'fixture'), sourceRef: entities[0]?.ref ?? { index: 0, generation: 1 }, targets: [], sourceSequence: 1 }, () => 1);
    expect(entities[0]?.resources.get(c.document.ruleset.health).current).toBe(999990);
    expect(kinds).toEqual(['DamageResolved', 'OperationDuplicate']); expect(guard.snapshot().tick.operations).toBe(2);
  });
  it('stops an actual self-reenqueuing interpreter cycle, diagnoses its root/producer, and faults Session without a partial boundary', () => {
    const h = harness(), c = h.catalog;
    const cyclic: { readonly kind: 'sequence'; readonly children: EffectNode[] } = { kind: 'sequence', children: [] }; cyclic.children.push(cyclic);
    const effect = contentId(c, 'damage_all');
    const corrupted = { ...c, document: { ...c.document, effects: c.document.effects.map(e => e.id === effect ? { ...e, node: cyclic } : e) } };
    const store = new EntityStore(h.config.sessionId), entities = createRoster(h.config, store), guard = new CapacityGuard(c.certificate, h.config.profile, 1);
    let diagnostic: CombatFault | null = null;
    const port: SimulationPort = { ...h.simulation, step() {
      guard.phase = 'P5'; guard.begin('illegal-root', effect, contentId(c, 'fixture'));
      try { executeRoot({ catalog: corrupted, definitions: buildDefinitionIndex(corrupted), entityIndex: new RuntimeEntityIndex(h.config.sessionId, store, entities), entities, guard, nextInstance: () => 1, emit: () => { throw new Error('cyclic AST must never commit'); } }, { rootId: 'illegal-root', effect, producer: contentId(c, 'fixture'), sourceRef: entities[0]?.ref ?? { index: 0, generation: 1 }, targets: [], sourceSequence: 1 }, () => 1); }
      catch (error) { if (error instanceof CombatFault) diagnostic = error; throw error; }
      return h.simulation.step();
    } };
    const session = new Session({ sessionId: h.config.sessionId, matchId: h.config.matchId, tickRate: 30, mode: 'empty', probeSpeedWorldPerSecond: 0 }, port, { clearInput: () => {}, beforeTick: () => {}, completedTick: () => {} });
    session.start(); session.frame(0); expect(() => session.frame(34)).toThrow('CERTIFICATE_VIOLATION');
    expect(diagnostic).toBeInstanceOf(CombatFault); expect(guard.tickIndex).toBe(1);
    expect(session.state).toBe('paused'); expect(session.debug().pauseReasons).toContain('fault'); expect(session.observation.tick).toBe(0);
    expect(h.debug.boundary().tick).toBe(0); expect(h.debug.boundary().entities[0]?.resources.find(r => r.id === 'health')?.current).toBe(1000000);
    session.releaseReason('fault'); expect(session.resume()).toBe(false); expect(session.singleStep()).toBe(false); session.dispose();
  });
  it('keeps an independent final fault ceiling for bypassed/invalid certificates', () => {
    const h = harness(), c = h.catalog.certificate;
    const invalid = { ...c, maintenance: { ...c.maintenance, ast: 100 }, tick: { ...c.tick, ast: 100 }, limit: { ...c.limit, ast: 2 } };
    const guard = new CapacityGuard(invalid, h.config.profile, 1); guard.charge('ast', 2);
    expect(() => guard.charge('ast')).toThrow('FAULT_LIMIT');
  });
});

it('binds producer to provenEffects before registering or executing a root', () => {
  const h = harness(), guard = new CapacityGuard(h.catalog.certificate, h.config.profile, 1);
  guard.phase = 'P5';
  try { guard.begin('mismatched', contentId(h.catalog, 'damage_all'), contentId(h.catalog, 'periodic')); throw new Error('must reject producer/effect'); }
  catch (error) { expect(error).toBeInstanceOf(CombatFault); if (error instanceof CombatFault) expect(error.diagnostic).toMatchObject({ code: 'PRODUCER_EFFECT_MISMATCH', rootId: 'mismatched', producer: 'periodic', opId: null, phase: 'P5' }); }
  const actual = guard.snapshot(); expect(actual.rootCount).toBe(0); expect(actual.tick.operations).toBe(0);
  expect(actual.producers.every(p => p.roots === 0)).toBe(true); expect(hpForMismatch()).toBe(1000000);
  function hpForMismatch() { return h.debug.boundary().entities[0]?.resources.find(r => r.id === 'health')?.current; }
});
it('direct Entity lookup rejects cross-session, stale generation, pending and disposed handles', () => {
  const h = harness(454), store = new EntityStore(h.config.sessionId), entities = createRoster(h.config, store), index = new RuntimeEntityIndex(h.config.sessionId, store, entities), ref = entities[453]?.ref;
  if (!ref) throw new Error('fixture');
  expect(index.get({ sessionId: h.config.sessionId, ref })).toBe(entities[453]);
  expect(index.get({ sessionId: sessionId('other-session'), ref })).toBeNull();
  expect(index.get({ sessionId: h.config.sessionId, ref: { ...ref, generation: ref.generation + 1 } })).toBeNull();
  store.markDespawn({ sessionId: h.config.sessionId, ref }); expect(index.get({ sessionId: h.config.sessionId, ref })).toBeNull();
  store.dispose(); expect(index.get({ sessionId: h.config.sessionId, ref: entities[0]?.ref ?? ref })).toBeNull();
});

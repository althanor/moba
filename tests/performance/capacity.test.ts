import { expect, it } from 'vitest';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { WORK_KEYS } from '../../src/contracts/index';
import { harness, rawFixture } from '../fixtures/m2';

it('settles the full ten-producer fixture envelope: twenty roots x 454 x three Operations', () => {
  const h = harness(454);
  for (let actor = 0; actor < 10; actor++) for (let root = 0; root < 2; root++) expect(h.submit('multi_all', 1, h.refs, h.refs[actor]).outcome).toBe('queued');
  h.simulation.step(); expect(h.debug.boundary().capacity.rootCount).toBe(20);
  expect(h.debug.boundary().capacity.roots.reduce((n, r) => n + r.work.operations, 0)).toBe(20 * 454 * 3);
  expect(h.debug.boundary().facts.filter(f => f.kind === 'DamageResolved')).toHaveLength(20 * 454);
  h.simulation.dispose();
}, 30000);

it('measures the 454-target joint peak with independent expected work; all Facts and results are retained', async () => {
  // Vitest batches task-report RPCs. Drain the previous report before a long
  // synchronous tick blocks this worker; this wait is outside Simulation/cost.
  await new Promise<void>(resolve => setTimeout(resolve, 50));
  const raw = rawFixture();
  const modifiers = raw.modifiers.map(m => ['replace', 'derive'].includes(m.id) ? { ...m, durationMs: 1000 } : m);
  const effects = raw.effects.map(e => e.id === 'shield_all' ? { id: e.id, node: { kind: 'targets', selector: 'primary', child: { kind: 'repeat', count: 4, child: { kind: 'shield', formula: 'ten', durationMs: 66, priority: 0, damageTypes: ['physical', 'magic', 'true'] } } } } : e);
  // This separate Ruleset proves its complete two-root producer envelope; it does not reduce roster/target capacities or change the main fixture Ruleset.
  const jointRaw = { ...raw, modifiers, effects, ruleset: { ...raw.ruleset, id: 'joint-peak-fixture', producers: raw.ruleset.producers.map(p => p.kind === 'fixture' ? { ...p, maxInstances: 1 } : p) } };
  const h = harness(454, jointRaw);
  h.submit('apply_replace', 1); h.submit('apply_derive', 1); h.simulation.step();
  h.submit('apply_pulse', 2, h.refs.slice(0, 453)); h.submit('apply_control', 2); h.simulation.step();
  h.submit('apply_pulse', 3, h.refs.slice(453)); h.submit('shield_all', 3); h.simulation.step(); h.simulation.step();
  h.submit('damage_all', 5); h.submit('damage_all', 5);
  const beforeHeapBytes = process.memoryUsage().heapUsed, startedAtMs = performance.now(); h.simulation.step(); const durationMs = performance.now() - startedAtMs;
  const b = h.debug.boundary(), certificate = h.catalog.certificate;
  const counts = (kind: string): number => b.facts.filter(f => f.kind === kind).length;
  expect(counts('ModifierExpired')).toBe(907); expect(counts('ShieldExpired')).toBe(1816);
  expect(b.capacity.producers.find(p => p.id === 'fixture')?.roots).toBe(2);
  expect(b.capacity.producers.find(p => p.id === 'expiry')?.roots).toBe(453);
  expect(b.capacity.producers.find(p => p.id === 'periodic')?.roots).toBe(1);
  // Two primary roots: each primary original + Replacement heal + complete 454-target secondary.
  const fixtureOperations = 2 * 454 * (1 + 1 + 454);
  // Each expiry heal derives 454 damage attempts, each replaced once by a heal.
  const expiryOperations = 453 * (1 + 454 * 2), periodicOperations = 1;
  const maintenanceOperations = 907 + 1816 + 454 * 2;
  expect(b.capacity.tick.operations).toBe(fixtureOperations + expiryOperations + periodicOperations + maintenanceOperations);
  for (const key of WORK_KEYS) { expect(b.capacity.tick[key], key).toBeLessThanOrEqual(certificate.tick[key]); expect(certificate.tick[key]).toBeLessThanOrEqual(certificate.limit[key]); expect(certificate.limit[key]).toBeLessThanOrEqual(h.config.profile.capacity[key]); }
  expect(h.debug.fault()).toBeNull(); expect(counts('DamageResolved')).toBe(2 * 454 * 454);
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync('reports/m2-capacity-peak.json', JSON.stringify({ status: 'PASS', scope: 'software capacity correctness; one diagnostic desktop run, not Android performance acceptance', contentHash: h.catalog.contentHash, certificate, profile: h.config.profile, actual: b.capacity, retainedFacts: b.facts.length, expectedOperations: fixtureOperations + expiryOperations + periodicOperations + maintenanceOperations, cost: { durationMs, beforeHeapBytes, afterHeapBytes: process.memoryUsage().heapUsed }, noTruncation: true }, null, 2) + '\n');
  h.simulation.dispose();
}, 120000);

it('settles the main Ruleset twenty-root Hook/Replacement/expiry peak using lossless Fact consumption and bounded debug retention', async () => {
  await new Promise<void>(resolve => setTimeout(resolve, 50));
  // Exact shipped catalog/profile: use legal producer instances to arrange the
  // half-open expiries instead of altering duration or Effect definitions.
  const h = harness(454, rawFixture(), 'summary'); h.simulation.step();
  h.submit('apply_pulse', 2, h.refs.slice(0, 453)); h.submit('apply_control', 2);
  for (let shield = 0; shield < 4; shield++) expect(h.submit('shield_all', 2, h.refs, h.refs[1 + Math.floor(shield / 2)]).outcome).toBe('queued');
  h.simulation.step();
  h.submit('apply_replace', 3); h.submit('apply_derive', 3);
  expect(h.submit('apply_pulse', 3, h.refs.slice(453), h.refs[1]).outcome).toBe('queued');
  h.simulation.step(); h.simulation.step();
  const expiryTargets = new Map(h.debug.boundary().entities.flatMap(e => e.statuses.filter(s => s.definition === 'pulsing' && s.startTick === 2).map(s => [s.instanceId, e.ref.index] as const)));
  for (let actor = 0; actor < 10; actor++) for (let root = 0; root < 2; root++) expect(h.submit('multi_all', 5, h.refs, h.refs[actor]).outcome).toBe('queued');
  const startedAtMs = performance.now(), beforeHeapBytes = process.memoryUsage().heapUsed; h.simulation.step(); const durationMs = performance.now() - startedAtMs;
  const b = h.debug.boundary(), c = h.catalog.certificate;
  const expectedOperations = 20 * 454 * (454 + 4) + 453 * (1 + 454 * 2) + 1 + 907 + 1816 + 454 * 2;
  expect(b.capacity.tick.operations).toBe(expectedOperations);
  expect(b.factDelivery.produced).toBe(b.factDelivery.consumed); expect(b.factDelivery.produced).toBe(b.capacity.tick.facts);
  expect(b.factDelivery.retained).toBe(2000); expect(b.factDelivery.queuePeak).toBe(1);
  expect(b.factDelivery.counts.find(c => c.kind === 'DamageResolved')?.count).toBe(20 * 454 * 454);
  expect(b.factDelivery.counts.find(c => c.kind === 'OperationReplaced')?.count).toBe(20 * 454 + 453 * 454);
  expect(b.factDelivery.counts.find(c => c.kind === 'ResourceResolved')?.count).toBe(20 * 454 + 1);
  expect(b.factDelivery.counts.find(c => c.kind === 'HealResolved')?.count).toBe(20 * 454 * 2 + 453 * (454 + 1));
  expect(b.factDelivery.counts.find(c => c.kind === 'ModifierExpired')?.count).toBe(907);
  expect(b.factDelivery.counts.find(c => c.kind === 'ShieldExpired')?.count).toBe(1816);
  expect(b.factDelivery.produced).toBe(9135386);
  expect(b.capacity.producers.find(p => p.id === 'fixture')?.roots).toBe(20);
  expect(b.capacity.producers.find(p => p.id === 'expiry')?.roots).toBe(453);
  expect(b.capacity.producers.find(p => p.id === 'periodic')?.roots).toBe(1);
  // Independent scalar oracle: each primary replacement heals 1, its depth-2
  // secondary damages every target 1, then the base sequence heals 1. An End
  // root heals its primary and its replaced secondary heals all 454 targets.
  let expectedHp = Array.from({ length: 454 }, () => 1000000);
  for (const root of b.capacity.roots) {
    if (root.effect === 'multi_all') for (let primary = 0; primary < 454; primary++) {
      expectedHp = expectedHp.map((value, i) => i === primary ? Math.min(1000000, value + 1) : value);
      expectedHp = expectedHp.map(value => value - 1);
      expectedHp = expectedHp.map((value, i) => i === primary ? Math.min(1000000, value + 1) : value);
    }
    else if (root.effect === 'end') {
      const primary = expiryTargets.get(Number(root.rootId.split(':').at(-1)));
      expect(primary).toBeDefined();
      expectedHp = expectedHp.map((value, i) => i === primary ? Math.min(1000000, value + 1) : value);
      expectedHp = expectedHp.map(value => Math.min(1000000, value + 1));
    } else expect(root.effect).toBe('pulse');
  }
  for (const entity of b.entities) expect(entity.resources.find(r => r.id === 'health')?.current).toBe(expectedHp[entity.ref.index]);
  for (const key of WORK_KEYS) { expect(b.capacity.tick[key]).toBeLessThanOrEqual(c.tick[key]); expect(c.tick[key]).toBeLessThanOrEqual(c.limit[key]); expect(c.limit[key]).toBeLessThanOrEqual(h.config.profile.capacity[key]); }
  expect(h.debug.fault()).toBeNull();
  fs.writeFileSync('reports/m2-main-capacity-peak.json', JSON.stringify({ status: 'PASS', scope: 'exact shipped catalog: all twenty largest fixture roots (multi_all), full 454 secondary targets, expiry/pulse/shield/regen overlap; no Operation/Hook/Replacement truncation', diagnosticArchive: 'summary: every Fact consumed exactly once, all counts retained; latest 2000 raw diagnostic records', contentHash: h.catalog.contentHash, certificate: c, profile: h.config.profile, actual: b.capacity, factDelivery: b.factDelivery, expectedOperations, expectedHealth: { independentlyVerifiedEntities: 454, minimum: Math.min(...expectedHp), maximum: Math.max(...expectedHp) }, cost: { durationMs, beforeHeapBytes, afterHeapBytes: process.memoryUsage().heapUsed }, noTruncationOfSettlement: true }, null, 2) + '\n');
  h.simulation.dispose();
}, 300000);

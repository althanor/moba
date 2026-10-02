import { WORK_KEYS } from '../../src/contracts/index';
import { describe, expect, it } from 'vitest';
import { createCombatRuntime } from '../../src/simulation/index';
import { compile, harness, hp, profile, rawFixture } from '../fixtures/m2';

describe('P0/P5/P6 combat fixtures', () => {
  it('resolves physical damage with a stage breakdown and true damage skips resistance', () => {
    const h = harness(); h.submit('damage_all', 1); h.simulation.step(); expect(hp(h)).toBe(999995);
    const damage = h.debug.boundary().facts.find(f => f.kind === 'DamageResolved');
    expect(damage?.breakdown).toMatchObject({ rawDamage: 10, resolvedDamage: 5, hpDamage: 5, shieldAbsorbed: 0 });
    expect(damage?.operation).toMatchObject({ producer: 'fixture', effect: 'damage_all', sourceOwnerRef: h.refs[0] });
    expect(damage?.breakdown?.stages.map(s => s.stage)).toContain('D5.resistance');
    h.submit('damage_true', 2); h.simulation.step(); expect(hp(h)).toBe(999985);
  });
  it('spends/regenerates/gains resources, rejects insufficient spend, and heal caps with actual values', () => {
    const h = harness(); for (let n = 1; n <= 8; n++) { h.submit('spend_all', n); h.simulation.step(); }
    const mana = h.debug.boundary().entities[0]?.resources.find(r => r.id === 'mana'); expect(mana?.current).toBe(8);
    expect(h.debug.boundary().facts.some(f => f.reason === 'insufficientResource')).toBe(true);
    h.submit('heal_all', 9); h.simulation.step(); const heal = h.debug.boundary().facts.find(f => f.kind === 'HealResolved'); expect(heal?.before).toBe(heal?.after);
  });
  it('absorbs damage, emits one shield-break fact, expires shields at P0 and preserves pool conservation', () => {
    const h = harness(); h.submit('shield_all', 1); h.submit('damage_true', 1); h.simulation.step(); expect(hp(h)).toBe(1000000);
    expect(h.debug.boundary().facts.filter(f => f.kind === 'ShieldBroken')).toHaveLength(1);
    const d = h.debug.boundary().facts.find(f => f.kind === 'DamageResolved')?.breakdown; expect(d?.shieldAbsorbed).toBe(10);
    h.submit('shield_all', 2); h.simulation.step(); h.simulation.step(); h.simulation.step(); h.submit('damage_true', 5); h.simulation.step(); expect(hp(h)).toBe(999990);
    expect(h.debug.boundary().facts.find(f => f.kind === 'ShieldExpired')?.phase).toBe('P0');
  });
  it('retains independent control sources and refreshes DAG attributes before the next Operation', () => {
    const h = harness(); h.submit('apply_control', 1); h.simulation.step(); h.submit('apply_control', 2); h.simulation.step();
    expect(h.debug.boundary().entities[0]?.attributes.find(a => a.id === 'derivedPower')?.final).toBe(15);
    h.simulation.step(); h.simulation.step(); expect(h.debug.boundary().entities[0]?.statuses).toHaveLength(1); expect(h.debug.boundary().entities[0]?.controlTags).toContain('stun');
    expect(h.debug.boundary().entities[0]?.capabilities.canCast).toBe(false);
    h.simulation.step(); expect(h.debug.boundary().entities[0]?.statuses).toHaveLength(0); expect(h.debug.boundary().entities[0]?.controlTags).not.toContain('stun');
  });
  it('consumes a one-use death-save atomically, then confirms exactly one death and refuses ordinary healing', () => {
    const h = harness(); h.submit('apply_save', 1); h.submit('lethal', 1); h.simulation.step(); expect(hp(h)).toBe(1);
    expect(h.debug.boundary().facts.filter(f => f.kind === 'DeathSaveConsumed')).toHaveLength(1); expect(h.debug.boundary().entities[0]?.statuses).toHaveLength(0);
    h.submit('lethal', 2); h.submit('heal_all', 2); h.simulation.step(); expect(hp(h)).toBe(0); expect(h.debug.boundary().entities[0]?.life).toBe('dead');
    expect(h.debug.boundary().facts.filter(f => f.kind === 'EntityDied')).toHaveLength(1); expect(h.debug.boundary().facts.some(f => f.reason === 'notAlive')).toBe(true);
    h.simulation.step(); expect(h.debug.boundary().entities[0]?.deathSequence).toBe(1);
  });
  it('identifies Replacement attempts and Post-derived causal chains', () => {
    const h = harness(2); h.submit('apply_replace', 1); h.submit('apply_derive', 1); h.simulation.step(); h.submit('damage_all', 2); h.simulation.step();
    const facts = h.debug.boundary().facts; expect(facts.some(f => f.kind === 'OperationReplaced')).toBe(true);
    const child = facts.find(f => f.operation?.depth === 2); expect(child?.operation?.parentId).toBeTruthy(); expect(child?.operation?.chain).toHaveLength(2);
    expect(h.debug.boundary().capacity.tick.operations).toBeGreaterThan(2);
  });
  it('does not pulse at the end boundary; expiry unregisters sources before the End Effect', () => {
    const h = harness(); h.submit('apply_pulse', 1); h.simulation.step(); h.simulation.step();
    expect(h.debug.boundary().capacity.producers.find(p => p.id === 'periodic')?.roots).toBe(1);
    h.simulation.step(); h.simulation.step(); expect(h.debug.boundary().capacity.producers.find(p => p.id === 'periodic')?.roots).toBe(0);
    expect(h.debug.boundary().capacity.producers.find(p => p.id === 'expiry')?.roots).toBe(1);
    expect(h.debug.boundary().facts.find(f => f.kind === 'ModifierExpired')?.phase).toBe('P0');
  });
  it('rejects under-capacity profile and mismatched Tick/content bindings before a world can run', () => {
    const h = harness(); expect(() => createCombatRuntime({ ...h.config, tickRate: 60 })).toThrow('binding');
    expect(() => createCombatRuntime({ ...h.config, profile: { ...h.config.profile, roots: 1 } })).toThrow('profile rejected');
  });
  it('deduplicates commands, rejects same-key changes and leaks no raw World through ordinary output', () => {
    const h = harness(), actor = h.refs[0]; const command = { matchId: h.config.matchId, kind: 'debugEffect', controllerId: 'fixture', sequence: 9, targetTick: 1, actorRef: actor, producer: 'fixture', effect: 'damage_all', targets: h.refs };
    expect(h.simulation.enqueue(command).outcome).toBe('queued'); expect(h.simulation.enqueue(command).outcome).toBe('queued');
    expect(h.simulation.enqueue({ ...command, effect: 'lethal' }).reason).toBe('sequenceConflict'); const output = h.simulation.step(); expect(hp(h)).toBe(999995);
    expect(h.simulation.enqueue(command).outcome).toBe('accepted'); expect(output.observation.entities).toEqual([]); expect(output.renderDelta.perceptionEvents).toEqual([]);
    expect(Object.isFrozen(h.debug.boundary().entities[0]?.resources)).toBe(true);
  });
  it('handles immunity and declared cancellation through controlled entry points', () => {
    const raw = rawFixture(); const modifiers = raw.modifiers.map(m => m.id === 'stun' ? { ...m, tags: ['invulnerable', 'immune:stun'] } : m);
    const h = harness(1, { ...raw, modifiers }); h.submit('apply_control', 1); h.simulation.step(); h.submit('damage_true', 2); h.submit('apply_control', 2); h.simulation.step(); expect(hp(h)).toBe(1000000);
    expect(h.debug.boundary().facts.some(f => f.reason === 'immune')).toBe(true); expect(h.debug.boundary().facts.some(f => f.reason === 'controlImmune')).toBe(true);
  });
  it('refreshes maximum resource Clamp immediately and distinguishes it from Damage', () => {
    const raw = rawFixture();
    const modifiers = raw.modifiers.map(m => m.id === 'save' ? { ...m, deathSaveHealth: 1000, contributions: [{ attribute: 'maxHealth', bucket: 'override', value: 1000, priority: 0 }] } : m);
    const effects = raw.effects.map(e => e.id === 'heal_all' ? { id: e.id, node: { kind: 'targets', selector: 'primary', child: { kind: 'heal', formula: 'lethal' } } } : e);
    const h = harness(1, { ...raw, modifiers, effects });
    const config = { ...h.config, roster: [{ level: 1, base: { maxHealth: 50 } }] };
    const runtime = createCombatRuntime(config), actorRef = runtime.debug.boundary().entities[0]?.ref;
    const send = (sequence: number, effect: string, targetTick: number): void => { expect(runtime.simulation.enqueue({ matchId: config.matchId, kind: 'debugEffect', controllerId: 'fixture', sequence, targetTick, actorRef, targets: [actorRef], producer: 'fixture', effect }).outcome).toBe('queued'); };
    send(1, 'apply_save', 1); send(2, 'heal_all', 1); runtime.simulation.step();
    send(3, 'lethal', 2); runtime.simulation.step();
    expect(runtime.debug.boundary().entities[0]?.resources.find(r => r.id === 'health')?.current).toBe(50);
    const d = runtime.debug.boundary().facts.find(f => f.kind === 'DamageResolved'); expect(d?.after).toBe(50); expect(d?.breakdown?.hpDamage).toBe(0);
    expect(d?.breakdown?.reasons).toContain('maximumClampIsNotDamage'); expect(runtime.debug.boundary().facts.find(f => f.kind === 'ResourceClamped')).toMatchObject({ before: 1000, after: 50 });
  });
  it('runs Post hooks only after a committed leaf, including ordinary rejection without Session fault', () => {
    const raw = rawFixture();
    const modifiers = raw.modifiers.map(m => m.id === 'derive' ? { ...m, durationMs: 1000, hooks: [{ id: 'afterSpend', stage: 'post', match: 'resource', priority: 0, maxTriggersPerRootTarget: 1, action: { kind: 'derive', effect: 'damage_true' } }] } : m);
    const h = harness(1, { ...raw, modifiers }); h.submit('apply_derive', 1); h.simulation.step();
    for (let tick = 2; tick <= 6; tick++) { h.submit('spend_all', tick); h.simulation.step(); }
    const before = hp(h); h.submit('spend_all', 7); h.simulation.step();
    expect(h.debug.boundary().facts.some(f => f.reason === 'insufficientResource')).toBe(true);
    expect(h.debug.boundary().facts.some(f => f.kind === 'HookInvoked' || f.kind === 'DamageResolved')).toBe(false);
    expect(hp(h)).toBe(before); expect(h.debug.fault()).toBeNull();
  });
  it('binds formula nodes and Attribute DAG intermediates to the Operation time before later expiry', () => {
    const raw = rawFixture();
    const formulas = [...raw.formulas, { id: 'dagDamage', unit: 'points', expression: { kind: 'multiply', left: { kind: 'attribute', id: 'derivedPower', stage: 'final', subject: 'source' }, right: { kind: 'constant', value: 2, unit: 'scalar' } } }];
    const effects = raw.effects.map(e => e.id === 'damage_true' ? { id: e.id, node: { kind: 'targets', selector: 'primary', child: { kind: 'damage', formula: 'dagDamage', damageType: 'true' } } } : e);
    const traceRaw = { ...raw, formulas, effects }, catalog = compile(traceRaw);
    // More formula nodes require a new proof-backed logical profile; the
    // shipped profile must reject them, and all 454 legal units remain legal.
    expect(() => harness(1, traceRaw)).toThrow('profile rejected');
    const h = harness(1, traceRaw, 'full', { ...profile(), id: 'm2-formula-trace', capacity: catalog.certificate.limit });
    h.submit('apply_control', 1); h.submit('damage_true', 1); h.simulation.step();
    const breakdown = h.debug.boundary().facts.find(f => f.kind === 'DamageResolved')?.breakdown;
    expect(breakdown?.rawDamage).toBe(25);
    expect(breakdown?.participants.some(p => p.startsWith('modifier:source:stun:'))).toBe(true);
    expect(breakdown?.stages).toEqual(expect.arrayContaining([{ stage: 'attribute:source:power.baseGrowthFlat', value: 25 }, { stage: 'attribute:source:power.final', value: 25 }, { stage: 'attribute:source:derivedPower.converted', value: 12.5 }, { stage: 'attribute:source:derivedPower.final', value: 12.5 }, { stage: 'formula:dagDamage.left', value: 12.5 }, { stage: 'formula:dagDamage.right', value: 2 }, { stage: 'formula:dagDamage', value: 25 }]));
    h.simulation.step(); h.simulation.step(); h.simulation.step();
    expect(h.debug.boundary().entities[0]?.attributes.find(a => a.id === 'derivedPower')?.final).toBe(10);
    expect(breakdown?.stages.find(s => s.stage === 'formula:dagDamage')?.value).toBe(25);
  });
});

it('keeps blocked diagnostic participant arrays immutable when a later Hook is still eligible', () => {
  const raw = rawFixture(), modifiers = raw.modifiers.map(m => m.id === 'replace' ? { ...m, hooks: [
    { id: 'aOnce', stage: 'pre', match: 'damage', priority: 0, maxTriggersPerRootTarget: 1, action: { kind: 'scale', factor: 1 } },
    { id: 'bTwice', stage: 'pre', match: 'damage', priority: 0, maxTriggersPerRootTarget: 2, action: { kind: 'scale', factor: 1 } }
  ] } : m);
  const effects = raw.effects.map(e => e.id === 'damage_all' ? { id: e.id, node: { kind: 'targets', selector: 'primary', child: { kind: 'repeat', count: 2, child: { kind: 'damage', formula: 'ten', damageType: 'physical' } } } } : e);
  const c = compile({ ...raw, modifiers, effects }), h = harness(1, { ...raw, modifiers, effects }, 'full', { ...profile(), capacity: c.certificate.limit, startup: c.certificate.startupLimit, command: c.certificate.commandLimit });
  h.submit('apply_replace', 1); h.simulation.step(); h.submit('damage_all', 2); h.simulation.step();
  expect(hp(h)).toBe(999990); expect(h.debug.fault()).toBeNull();
  const blocked = h.debug.boundary().facts.find(f => f.kind === 'HookIneligible');
  expect(blocked?.breakdown?.participants).toEqual([]); expect(Object.isFrozen(blocked?.breakdown?.participants)).toBe(true);
  expect(h.debug.boundary().facts.filter(f => f.kind === 'HookInvoked')).toHaveLength(3);
});

it('deep-freezes a verified catalog even when the caller supplied only a shallow frozen wrapper', () => {
  const h = harness(), catalog = Object.freeze(structuredClone(h.catalog));
  expect(Object.isFrozen(catalog.document.formulas[0]?.expression)).toBe(false);
  const runtime = createCombatRuntime({ ...h.config, catalog });
  expect(Object.isFrozen(catalog.document.formulas[0]?.expression)).toBe(true);
  expect(Object.isFrozen(catalog.document.effects[0]?.node)).toBe(true);
  expect(Reflect.set(catalog.document.formulas[0]?.expression ?? {}, 'value', 123)).toBe(false);
  expect(runtime.debug.boundary().capacity.scope).toBe('startup');
  for (const key of WORK_KEYS) expect(runtime.debug.boundary().capacity.tick[key]).toBeLessThanOrEqual(catalog.certificate.startup[key]);
  runtime.simulation.dispose();
});

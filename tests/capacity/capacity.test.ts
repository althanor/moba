import { describe, expect, it } from 'vitest';
import { WORK_KEYS } from '../../src/contracts/index';
import { harness, hp, rawFixture } from '../fixtures/m2';

function assertCertificate(h: ReturnType<typeof harness>): void {
  const actual = h.debug.boundary().capacity, c = h.catalog.certificate;
  for (const key of WORK_KEYS) {
    expect(actual.tick[key], key).toBeLessThanOrEqual(c.tick[key]); expect(c.tick[key], key).toBeLessThanOrEqual(c.limit[key]);
    expect(c.limit[key], key).toBeLessThanOrEqual(h.config.profile.capacity[key]);
  }
  for (const root of actual.roots) {
    const certificate = c.roots.find(r => r.effect === root.effect); expect(certificate).toBeDefined();
    for (const key of WORK_KEYS) expect(root.work[key], `${root.effect}.${key}`).toBeLessThanOrEqual(certificate?.work[key] ?? -1);
  }
  expect(actual.rootCount).toBeLessThanOrEqual(c.rootCount); expect(h.debug.fault()).toBeNull();
}
describe('full legal fanout and simultaneous capacity', () => {
  for (const count of [0, 1, 128, 129, 454]) it(`settles every one of ${count} primary targets with independent expected damage`, () => {
    const h = harness(Math.max(count, 1)); h.submit('damage_all', 1, h.refs.slice(0, count)); h.simulation.step();
    expect(h.debug.boundary().facts.filter(f => f.kind === 'DamageResolved')).toHaveLength(count);
    for (let i = 0; i < count; i++) expect(hp(h, i)).toBe(999995);
    expect(h.debug.boundary().capacity.roots[0]?.work.operations).toBe(count); assertCertificate(h);
  });
  it('settles multiple Operations per target in Sequence order without truncation', () => {
    const h = harness(454); h.submit('multi_all', 1); h.simulation.step();
    expect(h.debug.boundary().capacity.roots[0]?.work.operations).toBe(454 * 3);
    expect(h.debug.boundary().facts.filter(f => f.operation).map(f => f.kind).slice(0, 3)).toEqual(['DamageResolved', 'ResourceResolved', 'HealResolved']);
    for (let i = 0; i < 454; i++) expect(hp(h, i)).toBe(999996); assertCertificate(h);
  });
  it('counts original attempts plus Replacement attempts for 454 targets', () => {
    const h = harness(454); h.submit('apply_replace', 1); h.simulation.step(); h.submit('damage_all', 2); h.simulation.step();
    expect(h.debug.boundary().capacity.roots[0]?.work.operations).toBe(454 * 2);
    expect(h.debug.boundary().facts.filter(f => f.kind === 'HealResolved')).toHaveLength(454);
    expect(h.debug.boundary().facts.filter(f => f.kind === 'OperationReplaced')).toHaveLength(454); assertCertificate(h);
  });
  it('includes Hook-derived complete secondary fanout, preserving one root lineage', () => {
    const h = harness(129); h.submit('apply_derive', 1); h.simulation.step(); h.submit('heal_all', 2); h.simulation.step();
    const facts = h.debug.boundary().facts.filter(f => f.operation);
    expect(h.debug.boundary().capacity.roots[0]?.work.operations).toBe(129 + 129 * 129);
    expect(facts.filter(f => f.kind === 'DamageResolved')).toHaveLength(129 * 129);
    expect(new Set(facts.map(f => f.operation?.rootId)).size).toBe(1);
    // Each primary heal completes its derived subtree: later primaries heal damage from earlier subtrees, up to ten points.
    for (let i = 0; i < 129; i++) expect(hp(h, i)).toBe(1000000 - 129 + Math.min(i, 10)); assertCertificate(h);
  });
  it('admits multiple legal producers/roots and rejects only commands outside the declared producer envelope', () => {
    const h = harness(454);
    expect(h.submit('damage_all', 1).outcome).toBe('queued'); expect(h.submit('damage_all', 1).outcome).toBe('queued'); expect(h.submit('damage_all', 1).reason).toBe('producerLimit');
    h.submit('damage_all', 1, h.refs, h.refs[1]); h.simulation.step();
    expect(h.debug.boundary().capacity.rootCount).toBe(3); for (let i = 0; i < 454; i++) expect(hp(h, i)).toBe(999985); assertCertificate(h);
  });
  it('overlaps all certified M2 work classes: full targets, multiple roots, Hook/Replacement, expiry, pulse, shield and regeneration', () => {
    const raw = rawFixture();
    const modifiers = raw.modifiers.map(m => ['replace', 'derive'].includes(m.id) ? { ...m, durationMs: 1000 } : m);
    const h = harness(129, { ...raw, modifiers });
    h.submit('apply_replace', 1); h.submit('apply_derive', 1); h.simulation.step();
    const half = Math.floor(h.refs.length / 2);
    h.submit('apply_pulse', 2, h.refs.slice(0, half)); h.submit('apply_control', 2); h.submit('shield_all', 2, h.refs, h.refs[1]); h.submit('shield_all', 2, h.refs, h.refs[1]); h.simulation.step();
    h.submit('apply_pulse', 3, h.refs.slice(half)); h.simulation.step(); h.simulation.step();
    h.submit('damage_all', 5); h.submit('damage_all', 5); h.simulation.step();
    const b = h.debug.boundary();
    expect(b.facts.filter(f => f.kind === 'ModifierExpired')).toHaveLength(half + 129);
    expect(b.facts.filter(f => f.kind === 'ShieldExpired')).toHaveLength(258);
    expect(b.capacity.producers.find(p => p.id === 'expiry')?.roots).toBe(half);
    expect(b.capacity.producers.find(p => p.id === 'periodic')?.roots).toBe(129 - half);
    expect(b.capacity.producers.find(p => p.id === 'fixture')?.roots).toBe(2);
    expect(b.facts.some(f => f.kind === 'OperationReplaced')).toBe(true);
    expect(b.facts.some(f => f.operation?.depth === 2)).toBe(true); assertCertificate(h);
  }, 30000);
  it('supports finite trigger cycles using declared semantic fuel, with explicit ineligibility Facts', () => {
    const raw = rawFixture();
    const modifiers = raw.modifiers.map(m => m.id === 'derive' ? { ...m, hooks: [{ id: 'boundedHeal', stage: 'post', match: 'heal', priority: 0, maxTriggersPerRootTarget: 2, action: { kind: 'derive', effect: 'heal_one' } }] } : m);
    const h = harness(1, { ...raw, modifiers }); h.submit('apply_derive', 1); h.simulation.step(); h.submit('heal_all', 2); h.simulation.step();
    expect(h.debug.boundary().facts.filter(f => f.kind === 'HealResolved')).toHaveLength(3);
    expect(h.debug.boundary().facts.some(f => f.reason?.startsWith('depthFuel'))).toBe(true); assertCertificate(h);
  });
});

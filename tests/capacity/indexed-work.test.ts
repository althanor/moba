import { describe, expect, it, vi } from 'vitest';
import { WORK_KEYS } from '../../src/contracts/index';
import { compile, harness, hp, profile, rawFixture } from '../fixtures/m2';

function certifiedProfile(c: ReturnType<typeof compile>) { return { ...profile(), capacity: c.certificate.limit, startup: c.certificate.startupLimit, command: c.certificate.commandLimit }; }
describe('catalog cardinality and runtime lookup work', () => {
  it('keeps executable root and Tick work constant at 4096 formulas/effects/modifiers; only startup grows', () => {
    const raw = rawFixture();
    const formulas = [...raw.formulas, ...Array.from({ length: 4096 - raw.formulas.length }, (_, i) => ({ id: `a${String(i).padStart(4, '0')}`, unit: 'points', expression: { kind: 'constant', value: 10, unit: 'points' } }))];
    const effects = [...raw.effects, ...Array.from({ length: 4096 - raw.effects.length }, (_, i) => ({ id: `aEffect${String(i).padStart(4, '0')}`, node: { kind: 'heal', formula: 'one' } }))];
    const modifiers = [...raw.modifiers, ...Array.from({ length: 4096 - raw.modifiers.length }, (_, i) => ({ id: `aModifier${String(i).padStart(4, '0')}`, durationMs: 100, maxInstancesPerEntity: 1, contributions: [], tags: [], hooks: [], control: 'none', deathSaveHealth: null, pulse: null, end: null }))];
    const expanded = { ...raw, formulas, effects, modifiers }, c = compile(expanded), baseline = compile();
    expect(c.document.formulas).toHaveLength(4096); expect(c.document.effects).toHaveLength(4096); expect(c.document.modifiers).toHaveLength(4096);
    expect(c.document.formulas.findIndex(f => f.id === 'ten')).toBeGreaterThan(4090);
    expect(c.certificate.tick).toEqual(baseline.certificate.tick); expect(c.certificate.startup.structure).toBeGreaterThan(baseline.certificate.startup.structure);
    const small = harness(454), large = harness(454, expanded, 'full', certifiedProfile(c));
    small.submit('multi_all', 1); large.submit('multi_all', 1);
    const find = vi.spyOn(Array.prototype, 'find').mockImplementation(() => { throw new Error('hot Array.find forbidden'); });
    try { small.simulation.step(); large.simulation.step(); expect(find).not.toHaveBeenCalled(); } finally { find.mockRestore(); }
    expect(large.debug.boundary().capacity.tick).toEqual(small.debug.boundary().capacity.tick);
    for (let i = 0; i < 454; i++) expect(hp(large, i)).toBe(hp(small, i));
    for (const key of WORK_KEYS) expect(large.debug.boundary().capacity.tick[key]).toBeLessThanOrEqual(c.certificate.tick[key]);
    small.simulation.dispose(); large.simulation.dispose();
  }, 60000);
  it('resolves each of 454 leaf targets directly without any roster find or definition find', () => {
    const h = harness(454); h.submit('damage_true', 1);
    const find = vi.spyOn(Array.prototype, 'find').mockImplementation(() => { throw new Error('linear leaf target resolution'); });
    try { h.simulation.step(); expect(find).not.toHaveBeenCalled(); } finally { find.mockRestore(); }
    expect(h.debug.boundary().capacity.roots[0]?.work.operations).toBe(454);
    expect(h.debug.boundary().capacity.roots[0]?.work.lookups).toBe(2 + 454 * 4);
    for (let i = 0; i < 454; i++) expect(hp(h, i)).toBe(999990);
  });
});

describe('hand-counted scan conservation through the public runtime', () => {
  it('counts every pass of a clean one-target damage Tick: 33 total, 12 inside the root', () => {
    const h = harness(); h.submit('damage_all', 1); h.simulation.step(); const actual = h.debug.boundary().capacity;
    // Five roster/kernel passes. Resource refresh+regen+snapshot = 2+2+2.
    // P1 queue filters(2), command(1), root(1), history materialization(1).
    // Three one-element ordering copies. Primary target(1). Formula-stage
    // copy(1) plus fixed damage stages(9). Three consumed Facts.
    expect(actual.scanKinds).toEqual({ maintenance: 5, resource: 6, fact: 3, scheduler: 5, ordering: 3, query: 1, diagnostic: 10 });
    expect(actual.tick.scans).toBe(33); expect(actual.roots[0]?.work.scans).toBe(12);
    expect(Object.values(actual.scanKinds).reduce((n, value) => n + value, 0)).toBe(actual.tick.scans);
    expect(actual.tick.scans).toBeLessThanOrEqual(h.catalog.certificate.tick.scans);
  });
  it('conserves all scan classes across dirty attributes, unmatched/matched hooks, ancestry, shields and simultaneous expiry', () => {
    const raw = rawFixture(), extended = { ...raw, effects: raw.effects.map(e => e.id === 'shield_all' ? { id: e.id, node: { kind: 'targets', selector: 'primary', child: { kind: 'shield', formula: 'ten', durationMs: 66, priority: 0, damageTypes: ['physical', 'magic', 'true'] } } } : e), formulas: raw.formulas.map(f => f.id === 'ten' ? { ...f, expression: { kind: 'attribute', id: 'derivedPower', subject: 'source', stage: 'final' } } : f) };
    const c = compile(extended), h = harness(1, extended, 'full', certifiedProfile(c));
    // Tick 1: two status applications; each rebuild has four six-attribute
    // passes(24), one contribution order/copy(1), six contribution reads(6),
    // one collection read(1) =>32, twice=64. Status visits include snapshots,
    // registrations, matching and post-commit liveness, not just matches.
    h.submit('apply_control', 1); h.submit('apply_derive', 1); h.simulation.step();
    const expected1 = { maintenance: 5, resource: 10, fact: 4, scheduler: 10, ordering: 16, query: 2, status: 30, attribute: 64 };
    expect(h.debug.boundary().capacity.scanKinds).toEqual(expected1);
    // Tick 2: shield, heal, derived all-target damage. Primary scans 1+1;
    // secondary roster materialization+push 1+1. Three leaf hook collections
    // each visit the single hook even when match fails, plus pre/post visits.
    // The one shield type list is copied, matched and committed explicitly.
    h.submit('shield_all', 2); h.submit('heal_all', 2); h.simulation.step();
    const expected2 = { maintenance: 5, status: 63, resource: 6, fact: 6, scheduler: 12, ordering: 29, query: 4, diagnostic: 60, hook: 6, shield: 17 };
    expect(h.debug.boundary().capacity.scanKinds).toEqual(expected2);
    h.simulation.step(); h.simulation.step();
    // Tick 4: both statuses and the shield expire together; dirty rebuild is
    // four six-attribute passes, no contributions. All removal/filter passes
    // and P0/P9 shield snapshots are included.
    const expected4 = { maintenance: 5, status: 7, fact: 5, shield: 6, attribute: 24, resource: 6, scheduler: 4, ordering: 16 };
    const actual = h.debug.boundary().capacity;
    expect(actual.scanKinds).toEqual(expected4);
    expect(actual.tick.scans).toBe(Object.values(expected4).reduce((n, value) => n + value, 0));
    expect(actual.tick.scans).toBeLessThanOrEqual(c.certificate.tick.scans);
    expect(h.debug.boundary().entities[0]?.statuses).toHaveLength(0); expect(h.debug.boundary().entities[0]?.shields).toHaveLength(0);
    expect(hp(h)).toBe(1000000); expect(h.debug.fault()).toBeNull();
  });
});

it('charges large legal tag/shield-type lists and repeated attribute reads instead of hiding their cardinality', () => {
  const raw = rawFixture();
  const expression = (depth: number): unknown => depth ? { kind: 'min', left: expression(depth - 1), right: expression(depth - 1) } : { kind: 'attribute', id: 'power', stage: 'final', subject: 'source' };
  const formulas = raw.formulas.map(f => f.id === 'ten' ? { ...f, expression: expression(6) } : f);
  const modifiers = raw.modifiers.map(m => m.id === 'stun' ? { ...m, tags: Array.from({ length: 4096 }, (_, i) => `tag${i}`) } : m);
  const effects = raw.effects.map(e => e.id === 'shield_all' ? { id: e.id, node: { kind: 'targets', selector: 'primary', child: { kind: 'shield', formula: 'ten', durationMs: 1000, priority: 0, damageTypes: Array.from({ length: 4096 }, () => 'physical') } } } : e);
  const extended = { ...raw, formulas, modifiers, effects }, c = compile(extended), h = harness(1, extended, 'summary', certifiedProfile(c));
  h.submit('apply_control', 1); h.submit('shield_all', 1); h.simulation.step();
  h.submit('shield_all', 2); h.submit('shield_all', 2); h.simulation.step();
  h.submit('shield_all', 3); h.submit('damage_all', 3); h.simulation.step();
  expect(hp(h)).toBe(1000000); expect(h.debug.fault()).toBeNull();
  const b = h.debug.boundary(); expect(b.entities[0]?.shields).toHaveLength(4); expect(b.entities[0]?.controlTags).toHaveLength(4097);
  expect(b.capacity.scanKinds['shield']).toBeGreaterThan(4096 * 4); expect(b.capacity.scanKinds['status']).toBeGreaterThan(4096);
  const damage = b.capacity.roots.find(r => r.effect === 'damage_all'); expect(damage?.work.lookups).toBeGreaterThan(64);
  for (const key of WORK_KEYS) expect(b.capacity.tick[key]).toBeLessThanOrEqual(c.certificate.tick[key]);
}, 30000);

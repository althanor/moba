import { describe, expect, it } from 'vitest';
import { compileContent, validateProfile } from '../../src/content/index';
import { compile, profile, rawFixture } from '../fixtures/m2';

describe('CompiledCatalog and startup proof', () => {
  it('compiles real data, resolves stable IDs, freezes nested content and binds the certificate', () => {
    const c = compile(); expect(c.attributeOrder.findIndex(id => id === 'power')).toBeLessThan(c.attributeOrder.findIndex(id => id === 'derivedPower'));
    expect(Object.isFrozen(c.document.effects[0]?.node)).toBe(true); expect(c.certificate.contentHash).toBe(c.contentHash);
    expect(validateProfile(c.certificate, profile())).toEqual([]);
    expect(c.boundedTriggerCycles.some(cycle => cycle.path.includes('damage') && cycle.path.includes('heal'))).toBe(true);
    for (const root of c.certificate.roots) expect(root.S_e + root.F_e * (root.B_e + root.R_e + root.D_e)).toBe(root.work.operations);
  });
  it('canonical definition order ignores raw object and definition insertion order', () => {
    const raw = rawFixture(); raw.attributes.reverse(); raw.effects.reverse(); raw.modifiers.reverse(); raw.formulas.reverse();
    expect(compile(raw).contentHash).toBe(compile().contentHash);
  });
  it('reports missing references, unknown schema fields and invalid versions', () => {
    for (const raw of [{ ...rawFixture(), schemaVersion: 2 }, { ...rawFixture(), script: 'eval' }, { ...rawFixture(), effects: [{ id: 'bad', node: { kind: 'damage', formula: 'missing', damageType: 'true' } }] }]) {
      const result = compileContent(raw, 30); expect(result.ok).toBe(false); if (!result.ok) expect(result.diagnostics[0]?.path).toBeTruthy();
    }
  });
  it('reports a complete final-attribute dependency cycle', () => {
    const raw = rawFixture();
    const attrs = raw.attributes.map(a => a.id === 'power' ? { ...a, conversion: { kind: 'attribute', id: 'derivedPower', stage: 'final', subject: 'source' } } : a);
    const result = compileContent({ ...raw, attributes: attrs }, 30);
    expect(result.ok).toBe(false); if (!result.ok) { expect(result.diagnostics[0]?.code).toBe('ATTRIBUTE_CYCLE'); expect(result.diagnostics[0]?.message).toContain('power'); expect(result.diagnostics[0]?.message).toContain('derivedPower'); }
  });
  it('rejects dimension mistakes, zero denominator and nonfinite formula data', () => {
    const raw = rawFixture();
    const expressions = [
      { kind: 'add', left: { kind: 'constant', value: 1, unit: 'points' }, right: { kind: 'constant', value: 1, unit: 'scalar' } },
      { kind: 'divide', left: { kind: 'constant', value: 1, unit: 'points' }, right: { kind: 'constant', value: 0, unit: 'scalar' } },
      { kind: 'constant', value: Infinity, unit: 'points' }
    ];
    for (const expression of expressions) expect(compileContent({ ...raw, formulas: [{ id: 'bad', unit: 'points', expression }] }, 30).ok).toBe(false);
  });
  it('rejects dynamic/unproven paths before startup and rejects under-provisioned profiles', () => {
    const raw = rawFixture();
    expect(compileContent({ ...raw, ruleset: { ...raw.ruleset, maxHookDepth: undefined } }, 30).ok).toBe(false);
    expect(compileContent({ ...raw, effects: [{ id: 'unbounded', node: { kind: 'repeat', count: Infinity, child: { kind: 'heal', formula: 'one' } } }] }, 30).ok).toBe(false);
    const p = profile(); expect(validateProfile(compile().certificate, { ...p, capacity: { ...p.capacity, operations: 128 } })).toContain('profile.capacity.operations');
    expect(compileContent({ ...raw, ruleset: { ...raw.ruleset, producers: raw.ruleset.producers.map(p => p.kind === 'statusEnd' ? { ...p, maxInstances: 1 } : p) } }, 30).ok).toBe(false);
  });
  it('rejects unsafe capacity arithmetic instead of wrapping integer counters', () => {
    const raw = rawFixture();
    expect(compileContent({ ...raw, ruleset: { ...raw.ruleset, producers: raw.ruleset.producers.map(p => ({ ...p, rootsPerInstancePerTick: Number.MAX_SAFE_INTEGER })) } }, 30).ok).toBe(false);
  });
  it('rejects legal-input numeric envelopes that could overflow or produce negative damage', () => {
    const raw = rawFixture();
    const contributions = [{ attribute: 'power', bucket: 'multiply', value: Number.MAX_VALUE, priority: 0 }];
    expect(compileContent({ ...raw, modifiers: raw.modifiers.map(m => m.id === 'stun' ? { ...m, contributions } : m) }, 30).ok).toBe(false);
    expect(compileContent({ ...raw, formulas: raw.formulas.map(f => f.id === 'ten' ? { ...f, expression: { kind: 'constant', value: -1, unit: 'points' } } : f) }, 30).ok).toBe(false);
    expect(compileContent({ ...raw, resources: raw.resources.map(r => r.id === 'health' ? { ...r, initial: 0 } : r) }, 30).ok).toBe(false);
  });
  it('quantizes status duration once for the locked Tick rate', () => {
    expect(compile().document.modifiers.find(m => m.id === 'stun')?.durationTicks).toBe(3);
    expect(compile(rawFixture(), 60).document.modifiers.find(m => m.id === 'stun')?.durationTicks).toBe(6);
    expect(compile(rawFixture(), 60).contentHash).not.toBe(compile().contentHash);
  });
});

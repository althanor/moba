import { expect, it } from 'vitest';
import { harness, rawFixture } from '../fixtures/m2';

it('conserves resolved damage across shield/HP/overkill for generated independent fixtures', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const raw = rawFixture(), damage = seed * 137, shield = (seed * 97) % 1000, health = (seed * 59) % 1000 + 1;
    const formulas = raw.formulas.map(f => f.id === 'ten' ? { ...f, expression: { kind: 'constant', value: damage, unit: 'points' } } : f.id === 'one' ? { ...f, expression: { kind: 'constant', value: shield, unit: 'points' } } : f);
    const resources = raw.resources.map(r => r.id === 'health' ? { ...r, initial: health } : r);
    const effects = raw.effects.map(e => e.id === 'shield_all' ? { id: e.id, node: { kind: 'targets', selector: 'primary', child: { kind: 'shield', formula: 'one', durationMs: 100, priority: 0, damageTypes: ['true'] } } } : e);
    const h = harness(1, { ...raw, formulas, resources, effects }); h.submit('shield_all', 1); h.submit('damage_true', 1); h.simulation.step();
    const d = h.debug.boundary().facts.find(f => f.kind === 'DamageResolved')?.breakdown;
    expect(d?.shieldAbsorbed).toBe(Math.min(shield, damage)); expect(d?.hpDamage).toBe(Math.min(health, Math.max(0, damage - shield)));
    expect((d?.hpDamage ?? 0) + (d?.shieldAbsorbed ?? 0) + (d?.overkill ?? 0)).toBe(damage);
  }
});

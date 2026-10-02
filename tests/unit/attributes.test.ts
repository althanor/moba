import { describe, expect, it } from 'vitest';
import type { Contribution } from '../../src/contracts/index';
import { calculateAttributes, cooldownSeconds, effectiveResistance, resistanceMultiplier } from '../../src/simulation/index';
import { compile, contentId } from '../fixtures/m2';

describe('attribute stages and centralized formulas', () => {
  it('has explicit flat/additive/multiplicative/override/conversion/clamp semantics', () => {
    const catalog = compile(), id = contentId(catalog, 'power');
    const contribution = (bucket: Contribution['bucket'], value: number, priority = 0) => ({ definition: contentId(catalog, 'stun'), instanceId: 1, contribution: { attribute: id, bucket, value, priority } });
    const cs = [contribution('flat', 10), contribution('percent', .5), contribution('multiply', 2), contribution('override', 80, 2), contribution('override', 60, 1)];
    const value = calculateAttributes(catalog, 1, {}, cs, () => {});
    expect(value.find(a => a.id === 'power')).toMatchObject({ baseGrowthFlat: 30, additivePercent: 45, multiplied: 90, overridden: 80, final: 80 });
    expect(value.find(a => a.id === 'derivedPower')?.final).toBe(40);
    expect(calculateAttributes(catalog, 1, {}, cs.reverse(), () => {})).toEqual(value);
  });
  it('handles zero/negative resistance and multiplicative penetration without applying penetration below zero', () => {
    expect(resistanceMultiplier(0)).toBe(1); expect(resistanceMultiplier(100)).toBe(.5); expect(resistanceMultiplier(-100)).toBe(1.5);
    expect(effectiveResistance(100, 0, 0, [.5, .5], 0)).toBe(25);
    expect(effectiveResistance(50, 100, 0, [.9], 99)).toBe(-50);
    expect(cooldownSeconds(10, 100)).toBe(5); expect(() => cooldownSeconds(10, -100)).toThrow();
  });
});

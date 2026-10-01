import { describe, expect, it } from 'vitest';
import { FixedTick } from '../../src/application/index';
describe('Fixed Tick wall clock policy', () => {
  it('keeps fractional time, uses a single entry and supports different simulation rates', () => {
    for (const rate of [15, 30, 60]) {
      const clock = new FixedTick(rate); let ticks = 0; clock.pulse(0, () => true);
      for (let frame = 1; frame <= 120; frame++) clock.pulse(frame * 1000 / 120, () => { ticks++; return true; });
      expect(ticks).toBe(rate);
    }
  });
  it('pauses after four steps with remaining whole backlog; does not skip ticks', () => {
    const clock = new FixedTick(30); let ticks = 0; clock.pulse(0, () => true);
    const result = clock.pulse(200, () => { ticks++; return true; }); expect(ticks).toBe(4); expect(result.overload).toBe(true);
    expect(result.backlogMs).toBeCloseTo(200 - 4 * 1000 / 30); expect(clock.pulse(500, () => true).ticks).toBe(0);
  });
  it('rejects a >250 ms foreground gap before advancing and resets on resume', () => {
    const clock = new FixedTick(30); clock.pulse(0, () => true); expect(clock.pulse(251, () => true)).toMatchObject({ ticks: 0, overload: true });
    expect(clock.pulse(10000, () => true).ticks).toBe(0); expect(() => clock.pulse(9999, () => true)).toThrow();
  });
});

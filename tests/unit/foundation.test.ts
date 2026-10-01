import { describe, expect, it } from 'vitest';
import { direction, durationTicks, hashNumbers, RingBuffer, SeededRng, tick } from '../../src/foundation/index';
describe('foundation', () => {
  it('converts durations once by ceil at the configured rate', () => {
    expect(durationTicks(0, 30)).toBe(0); expect(durationTicks(34, 30)).toBe(2); expect(durationTicks(34, 60)).toBe(3);
    expect(() => durationTicks(-1, 30)).toThrow(); expect(() => durationTicks(Infinity, 30)).toThrow(); expect(() => durationTicks(1, 0)).toThrow();
    expect(() => tick(0.5)).toThrow();
  });
  it('handles zero, normalized and non-finite directions', () => {
    expect(direction(0, 0)).toEqual({ xWorld: 0, yWorld: 0 }); expect(direction(3, 4)).toEqual({ xWorld: 0.6, yWorld: 0.8 });
    expect(() => direction(NaN, 1)).toThrow();
  });
  it('RNG has a known vector and independently serializable state', () => {
    const rng = new SeededRng(1); expect(rng.nextUint32()).toBe(270369); expect(rng.nextUint32()).toBe(67634689);
    const resumed = new SeededRng(rng.snapshot().state); expect(resumed.nextUint32()).toBe(rng.nextUint32());
  });
  it('bounded ring preserves chronological order and returns copies', () => {
    const ring = new RingBuffer<number>(3); [1, 2, 3, 4, 5].forEach(value => ring.push(value));
    expect(ring.values()).toEqual([3, 4, 5]); expect(ring.size).toBe(3); ring.clear(); expect(ring.size).toBe(0);
  });
  it('diagnostic hash is stable and rejects invalid authority values', () => {
    expect(hashNumbers([1, 2])).toBe(hashNumbers([1, 2])); expect(hashNumbers([2, 1])).not.toBe(hashNumbers([1, 2])); expect(() => hashNumbers([NaN])).toThrow();
  });
});

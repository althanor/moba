import { finite, integer } from '../../foundation/index';
export interface ClockResult { readonly ticks: number; readonly alpha: number; readonly overload: boolean; readonly backlogMs: number }
export class FixedTick {
  readonly stepMs: number;
  #lastMs: number | null = null;
  #accumulatorMs = 0;
  constructor(readonly tickRate: number) { integer(tickRate, 'tickRate', 1); this.stepMs = 1000 / tickRate; }
  reset(): void { this.#lastMs = null; this.#accumulatorMs = 0; }
  pulse(nowMs: number, step: () => boolean): ClockResult {
    finite(nowMs, 'nowMs');
    const lastMs = this.#lastMs;
    if (lastMs !== null && nowMs < lastMs) throw new RangeError('non-monotonic clock');
    this.#lastMs = nowMs;
    if (lastMs === null) return { ticks: 0, alpha: 0, overload: false, backlogMs: 0 };
    const elapsedMs = nowMs - lastMs;
    if (elapsedMs > 250) { this.reset(); return { ticks: 0, alpha: 0, overload: true, backlogMs: elapsedMs }; }
    this.#accumulatorMs += elapsedMs;
    let ticks = 0;
    const epsilonMs = this.stepMs * 1e-9;
    while (this.#accumulatorMs + epsilonMs >= this.stepMs && ticks < 4) {
      this.#accumulatorMs = Math.max(0, this.#accumulatorMs - this.stepMs);
      ticks++;
      if (!step()) { this.reset(); return { ticks, alpha: 0, overload: false, backlogMs: 0 }; }
    }
    if (this.#accumulatorMs + epsilonMs >= this.stepMs) {
      const backlogMs = this.#accumulatorMs; this.reset();
      return { ticks, alpha: 0, overload: true, backlogMs };
    }
    return { ticks, alpha: this.#accumulatorMs / this.stepMs, overload: false, backlogMs: this.#accumulatorMs };
  }
}

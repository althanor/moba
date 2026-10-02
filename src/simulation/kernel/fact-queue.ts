import { checkedAdd, deepFreeze, RingBuffer, stableMergeSort } from '../../foundation/index';
import type { CombatFact, FactDelivery } from '../../contracts/index';

/** Single synchronous consumer; queue occupancy <=1 follows from non-reentrant handoff, not from dropping records. */
export class FactQueue {
  #pending: CombatFact | null = null;
  #full: CombatFact[] = [];
  #recent = new RingBuffer<CombatFact>(2000);
  #counts = new Map<string, number>();
  #produced = 0; #consumed = 0; #peak = 0;
  constructor(readonly mode: 'full' | 'summary', readonly capacity: number, readonly chargeStructure: (n: number) => void = () => {}) { if (capacity < 1) throw new Error('Fact queue profile'); }
  push(fact: CombatFact): void {
    if (this.#pending) throw new Error('reentrant Fact delivery');
    this.#pending = fact; this.#produced = checkedAdd(this.#produced, 1); this.#peak = 1;
    // Every committed Fact is processed; only the optional debug archive retention differs.
    this.#counts.set(fact.kind, checkedAdd(this.#counts.get(fact.kind) ?? 0, 1));
    if (this.mode === 'full') this.#full.push(fact); else this.#recent.push(fact);
    this.#consumed = checkedAdd(this.#consumed, 1); this.#pending = null;
  }
  records(): readonly CombatFact[] { return this.mode === 'full' ? this.#full : (this.chargeStructure(4 * this.#recent.size), this.#recent.values()); }
  delivery(): FactDelivery {
    if (this.#pending || this.#produced !== this.#consumed) throw new Error('Fact conservation');
    this.chargeStructure(this.#counts.size * 2);
    return deepFreeze({ mode: this.mode, produced: this.#produced, consumed: this.#consumed, retained: this.records().length, queuePeak: this.#peak, counts: stableMergeSort([...this.#counts.entries()], ([a], [b]) => a < b ? -1 : a > b ? 1 : 0, this.chargeStructure).map(([kind, count]) => ({ kind, count })) });
  }
}

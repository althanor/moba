import type { RawInput } from '../../contracts/index';
export class PointerTracker {
  #active = new Map<number, RawInput>();
  accept(sample: RawInput): boolean {
    if (sample.phase === 'begin') { this.#active.set(sample.pointerId, sample); return true; }
    if (!this.#active.has(sample.pointerId)) return false;
    if (sample.phase === 'end' || sample.phase === 'cancel') this.#active.delete(sample.pointerId);
    else this.#active.set(sample.pointerId, sample);
    return true;
  }
  clear(): void { this.#active.clear(); }
  get samples(): readonly RawInput[] { return [...this.#active.values()].sort((a, b) => a.pointerId - b.pointerId); }
  get size(): number { return this.#active.size; }
}

import { integer } from '../../foundation/index';
import type { SessionId } from '../../foundation/index';
import type { EntityRef, ScopedEntityRef } from '../../contracts/index';

interface Slot { generation: number; active: boolean; pending: boolean; retired: boolean }
export class EntityStore {
  #slots: Slot[] = [];
  #disposed = false;
  constructor(readonly sessionId: SessionId, readonly maxGeneration = 0xffffffff) { integer(maxGeneration, 'maxGeneration', 1); }
  create(visit: () => void = () => {}): ScopedEntityRef {
    if (this.#disposed) throw new Error('store disposed');
    // Stable lowest free slot; retired generations never wrap.
    let index = this.#slots.findIndex(slot => { visit(); return !slot.active && !slot.retired; });
    if (index < 0) { index = this.#slots.length; this.#slots.push({ generation: 0, active: false, pending: false, retired: false }); }
    const slot = this.#slots[index];
    if (!slot) throw new Error('slot invariant');
    slot.generation++; slot.active = true; slot.pending = false;
    return Object.freeze({ sessionId: this.sessionId, ref: Object.freeze({ index, generation: slot.generation }) });
  }
  valid(handle: ScopedEntityRef): boolean {
    if (this.#disposed || handle.sessionId !== this.sessionId || !Number.isSafeInteger(handle.ref.index) || !Number.isSafeInteger(handle.ref.generation)) return false;
    const slot = this.#slots[handle.ref.index];
    return !!slot && slot.active && !slot.pending && slot.generation === handle.ref.generation;
  }
  markDespawn(handle: ScopedEntityRef): boolean {
    if (!this.valid(handle)) return false;
    const slot = this.#slots[handle.ref.index];
    if (!slot) throw new Error('slot invariant');
    slot.pending = true; return true;
  }
  commitStructure(visit: () => void = () => {}): void {
    for (const slot of this.#slots) { visit(); if (slot.pending) {
      slot.active = false; slot.pending = false;
      if (slot.generation >= this.maxGeneration) slot.retired = true;
    } }
  }
  refs(): readonly EntityRef[] {
    return Object.freeze(this.#slots.flatMap((slot, index) => slot.active && !slot.pending ? [Object.freeze({ index, generation: slot.generation })] : []));
  }
  hashState(): readonly number[] { return this.#slots.flatMap(slot => [slot.generation, +slot.active, +slot.pending, +slot.retired]); }
  dispose(): void { this.#disposed = true; this.#slots = []; }
}

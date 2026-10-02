import type { EntityRef, ScopedEntityRef } from '../../contracts/index';
import type { SessionId } from '../../foundation/index';
import type { EntityStore } from '../kernel/entity-store';
import type { CapacityGuard } from '../kernel/capacity-guard';
import type { RuntimeEntity } from './combat-state';

/** M2 roster is fixed. Future structure commits must explicitly rebuild/update this owner. */
export class RuntimeEntityIndex {
  readonly #slots: (RuntimeEntity | undefined)[] = [];
  constructor(readonly sessionId: SessionId, readonly store: EntityStore, entities: readonly RuntimeEntity[]) {
    for (const entity of entities) { if (this.#slots[entity.ref.index]) throw new Error('entity index duplicate'); this.#slots[entity.ref.index] = entity; }
  }
  get(handle: ScopedEntityRef, guard: CapacityGuard | null = null): RuntimeEntity | null {
    guard?.charge('lookups'); if (handle.sessionId !== this.sessionId || !this.store.valid(handle)) return null;
    const entity = this.#slots[handle.ref.index]; return entity?.ref.generation === handle.ref.generation ? entity : null;
  }
  clear(): void { this.#slots.length = 0; }
  resolve(ref: EntityRef, guard: CapacityGuard): RuntimeEntity { return this.get({ sessionId: this.sessionId, ref }, guard) ?? guard.fault('ENTITY_REF', `${ref.index}:${ref.generation}`); }
}

import { describe, expect, it } from 'vitest';
import { sessionId } from '../../src/foundation/index';
// Explicitly allowlisted white-box test of the minimum entity kernel.
import { EntityStore } from '../../src/simulation/kernel/entity-store';
describe('EntityRef lifecycle', () => {
  it('invalidates pending despawn immediately and never resurrects the old generation', () => {
    const store = new EntityStore(sessionId('one')); const old = store.create();
    expect(store.valid(old)).toBe(true); expect(store.markDespawn(old)).toBe(true); expect(store.valid(old)).toBe(false);
    expect(store.markDespawn(old)).toBe(false); store.commitStructure(); const next = store.create();
    expect(next.ref.index).toBe(old.ref.index); expect(next.ref.generation).toBe(old.ref.generation + 1); expect(store.valid(old)).toBe(false);
  });
  it('retires slots at the generation limit', () => {
    const store = new EntityStore(sessionId('one'), 2);
    const a = store.create(); store.markDespawn(a); store.commitStructure(); const b = store.create();
    store.markDespawn(b); store.commitStructure(); const c = store.create(); expect(c.ref.index).toBe(1); expect(store.valid(a)).toBe(false);
  });
  it('session scope prevents an old-match handle accessing the same numbers', () => {
    const first = new EntityStore(sessionId('first')); const old = first.create();
    const next = new EntityStore(sessionId('next')); next.create(); expect(next.valid(old)).toBe(false);
    first.dispose(); first.dispose(); expect(first.valid(old)).toBe(false); expect(() => first.create()).toThrow();
  });
});

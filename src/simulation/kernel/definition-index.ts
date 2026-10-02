import type { CompiledCatalog, ContentId } from '../../contracts/index';
import type { CapacityGuard } from './capacity-guard';

/** No mutator or iterator is exposed. Canonical arrays remain the rule order. */
export class DefinitionIndex<T extends { readonly id: ContentId }> {
  readonly #values = new Map<string, T>();
  constructor(items: readonly T[], visit: () => void = () => {}) { for (const item of items) { visit(); if (this.#values.has(item.id)) throw new Error(`duplicate definition:${item.id}`); this.#values.set(item.id, item); } }
  get(id: string, guard: CapacityGuard | null = null): T { guard?.charge('lookups'); const value = this.#values.get(id); if (!value) throw new Error(`missing definition:${id}`); return value; }
  has(id: string): boolean { return this.#values.has(id); }
}
export function buildDefinitionIndex(catalog: CompiledCatalog, guard: CapacityGuard | null = null) {
  const d = catalog.document, visit = (): void => guard?.scan('maintenance', 1);
  return Object.freeze({ effects: new DefinitionIndex(d.effects, visit), formulas: new DefinitionIndex(d.formulas, visit), modifiers: new DefinitionIndex(d.modifiers, visit), attributes: new DefinitionIndex(d.attributes, visit), resources: new DefinitionIndex(d.resources, visit), producers: new DefinitionIndex(d.ruleset.producers, visit) });
}
export type RuntimeDefinitions = ReturnType<typeof buildDefinitionIndex>;

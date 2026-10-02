import { deepFreeze, integer } from '../../foundation/index';
import type { AttributeTrace, CombatConfig, CombatEntitySnapshot, CompiledCatalog, ContentId, EntityRef, ModifierDef } from '../../contracts/index';
import type { EntityStore } from '../kernel/entity-store';
import { buildDefinitionIndex } from '../kernel/definition-index';
import type { RuntimeDefinitions } from '../kernel/definition-index';
import { AttributeCache, calculateAttributes } from '../features/attributes/evaluate';
import { ResourceStore } from '../features/resources/store';
import { StatusStore, controlCapabilities } from '../features/status/store';
import { VitalityStore } from '../features/combat/settlement';
import type { CapacityGuard } from '../kernel/capacity-guard';
import { noScan, ordered, visits } from '../shared/work';
import type { Scan } from '../shared/work';

export interface RuntimeEntity {
  readonly ref: EntityRef; readonly level: number; readonly base: Readonly<Record<string, number>>;
  readonly resources: ResourceStore; readonly statuses: StatusStore; readonly vitality: VitalityStore; readonly attributes: AttributeCache;
}
export function traces(catalog: CompiledCatalog, definitions: RuntimeDefinitions, entity: RuntimeEntity, guard: CapacityGuard | null): readonly AttributeTrace[] {
  const cached = entity.attributes.get(entity.statuses.version); if (cached) return cached;
  const scan: Scan = (kind, n) => guard?.scan(kind, n), contributions = [];
  for (const s of visits(entity.statuses.snapshot(), scan, 'status')) for (const contribution of visits(definitions.modifiers.get(s.definition, guard).contributions, scan, 'attribute')) contributions.push({ definition: s.definition, instanceId: s.instanceId, contribution });
  const values = calculateAttributes(catalog, entity.level, entity.base, contributions, (kind, n) => kind === 'scans' ? guard?.scan('attribute', n) : guard?.charge(kind, n), definitions.attributes);
  guard?.scan('attribute', values.length); return entity.attributes.update(entity.statuses.version, values);
}
export function attribute(entity: RuntimeEntity, id: ContentId, guard: CapacityGuard | null, stage: 'pre' | 'final' = 'final'): number {
  guard?.charge('lookups'); const value = entity.attributes.read(id); return stage === 'pre' ? value.overridden : value.final;
}
export function refresh(catalog: CompiledCatalog, definitions: RuntimeDefinitions, entity: RuntimeEntity, guard: CapacityGuard): void {
  traces(catalog, definitions, entity, guard); entity.resources.refresh(catalog.document.resources, id => attribute(entity, id, guard));
}
export function statusDefs(definitions: RuntimeDefinitions, entity: RuntimeEntity, guard: CapacityGuard | null): readonly { readonly instanceId: number; readonly definition: ModifierDef }[] {
  const result = [], scan: Scan = (kind, n) => guard?.scan(kind, n);
  for (const s of visits(entity.statuses.snapshot(), scan, 'status')) result.push({ instanceId: s.instanceId, definition: definitions.modifiers.get(s.definition, guard) }); return result;
}
export function snapshot(catalog: CompiledCatalog, definitions: RuntimeDefinitions, entity: RuntimeEntity, guard: CapacityGuard | null): CombatEntitySnapshot {
  const scan: Scan = (kind, n) => guard?.scan(kind, n), statuses = entity.statuses.snapshot(), defs = statusDefs(definitions, entity, guard), tags = new Set<string>(), controlDefs = [];
  for (const s of visits(defs, scan, 'status')) { for (const tag of visits(s.definition.tags, scan, 'status')) tags.add(tag); if (s.definition.control !== 'none') tags.add(s.definition.control); controlDefs.push(s.definition); }
  scan('status', tags.size); const controlTags = ordered([...tags], (a, b) => a < b ? -1 : a > b ? 1 : 0, scan);
  const shields = []; for (const s of visits(entity.vitality.shields(), scan, 'shield')) shields.push({ instanceId: s.instanceId, remaining: s.remaining, endTick: s.endTick });
  const value = { ref: { ...entity.ref }, life: entity.vitality.life, deathSequence: entity.vitality.deathSequence, resources: entity.resources.snapshot(), statuses, shields, attributes: traces(catalog, definitions, entity, guard), controlTags, capabilities: controlCapabilities(controlDefs, scan) };
  return guard ? guard.freeze(value) : deepFreeze(value);
}
export function createRoster(config: CombatConfig, store: EntityStore, definitions = buildDefinitionIndex(config.catalog), scan: Scan = noScan, guard: CapacityGuard | null = null): readonly RuntimeEntity[] {
  if (config.roster.length > config.catalog.document.ruleset.maxUnits) throw new Error('roster capacity');
  const output: RuntimeEntity[] = [];
  for (const input of visits(config.roster, scan, 'maintenance')) {
    integer(input.level, 'level', 1); if (input.level > 100) throw new RangeError('level envelope 100');
    for (const [key, value] of Object.entries(input.base)) { scan('attribute', 1); const a = definitions.attributes.get(key, guard); if (!Number.isFinite(value) || value < a.min || value > a.max) throw new Error(`base envelope:${key}`); }
    const ref = store.create(() => scan('maintenance', 1)).ref;
    const values = calculateAttributes(config.catalog, input.level, input.base, [], (kind, n) => kind === 'scans' ? scan('attribute', n) : guard?.charge(kind, n), definitions.attributes);
    const attributes = new AttributeCache(); scan('attribute', values.length); attributes.update(0, values);
    output.push({ ref, level: input.level, base: deepFreeze({ ...input.base }), resources: new ResourceStore(config.catalog.document.resources, id => { guard?.charge('lookups'); return attributes.read(id).final; }, scan), statuses: new StatusStore(scan), vitality: new VitalityStore(scan), attributes });
  }
  return output;
}

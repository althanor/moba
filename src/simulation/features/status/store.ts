import type { ContentId, EntityRef, ModifierDef, StatusSnapshot } from '../../../contracts/index';

import { noScan, visits } from '../../shared/work';
import type { Scan } from '../../shared/work';

export class StatusStore {
  constructor(readonly scan: Scan = noScan) {}
  get count(): number { return this.#instances.length; }
  #instances: StatusSnapshot[] = [];
  #version = 0;
  get version(): number { return this.#version; }
  snapshot(): readonly StatusSnapshot[] { const result: StatusSnapshot[] = []; for (const s of visits(this.#instances, this.scan, 'status')) result.push({ ...s, source: { ...s.source } }); return result; }
  apply(definition: ModifierDef, source: EntityRef, tick: number, instanceId: number, entityCapacity: number, globalAvailable: boolean): string | null {
    if (this.#instances.length >= entityCapacity || !globalAvailable || this.matching(definition.id).length >= definition.maxInstancesPerEntity) return 'statusCapacity';
    this.#instances.push({ instanceId, definition: definition.id, source: { ...source }, startTick: tick, endTick: tick + definition.durationTicks }); this.#version++; return null;
  }
  remove(id: number): boolean { const old = this.#instances.length; this.#instances = this.#instances.filter(s => { this.scan('status', 1); return s.instanceId !== id; }); const changed = this.#instances.length !== old; if (changed) this.#version++; return changed; }
  matching(id: ContentId): readonly StatusSnapshot[] { const result: StatusSnapshot[] = []; for (const s of visits(this.#instances, this.scan, 'status')) if (s.definition === id) result.push({ ...s, source: { ...s.source } }); return result; }
}
export function controlCapabilities(definitions: readonly ModifierDef[], scan: Scan = noScan): { readonly canMove: boolean; readonly canBasicAttack: boolean; readonly canCast: boolean; readonly canDisplace: boolean; readonly targetable: boolean } {
  const tags = new Set<string>(); for (const d of visits(definitions, scan, 'status')) { for (const tag of visits(d.tags, scan, 'status')) tags.add(tag); tags.add(d.control); }
  return { canMove: !tags.has('stun') && !tags.has('cannotMove'), canBasicAttack: !tags.has('stun') && !tags.has('disarm'), canCast: !tags.has('stun') && !tags.has('silence'), canDisplace: !tags.has('cannotDisplace'), targetable: !tags.has('untargetable') };
}

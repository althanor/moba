import { noScan, visits } from '../../shared/work';
import type { Scan } from '../../shared/work';
import { finite } from '../../../foundation/index';
import type { ContentId, ResourceDef, ResourceSnapshot } from '../../../contracts/index';

export class ResourceStore {
  readonly #values = new Map<ContentId, ResourceSnapshot>();
  constructor(defs: readonly ResourceDef[], maximum: (id: ContentId) => number, readonly scan: Scan = noScan) {
    for (const d of visits(defs, this.scan, 'resource')) { const max = maximum(d.maximumAttribute); this.#values.set(d.id, { id: d.id, current: Math.min(d.initial, max), maximum: max }); }
  }
  get(id: ContentId): ResourceSnapshot { const v = this.#values.get(id); if (!v) throw new Error(`resource:${id}`); return { ...v }; }
  set(id: ContentId, current: number): void {
    const v = this.get(id); finite(current, `resource:${id}`);
    if (current < 0 || current > v.maximum) throw new RangeError(`resource invariant:${id}`);
    this.#values.set(id, { ...v, current });
  }
  refresh(defs: readonly ResourceDef[], maximum: (id: ContentId) => number): void {
    for (const d of visits(defs, this.scan, 'resource')) { const v = this.get(d.id), max = finite(maximum(d.maximumAttribute), d.id); this.#values.set(d.id, { id: d.id, current: Math.min(v.current, max), maximum: max }); }
  }
  change(id: ContentId, amount: number, mode: 'gain' | 'spend'): { readonly before: number; readonly after: number; readonly reason: string | null } {
    if (!Number.isFinite(amount) || amount < 0) throw new RangeError('resource amount');
    const v = this.get(id);
    if (mode === 'spend' && amount > v.current) return { before: v.current, after: v.current, reason: 'insufficientResource' };
    const after = mode === 'gain' ? Math.min(v.maximum, v.current + amount) : v.current - amount;
    this.set(id, after); return { before: v.current, after, reason: null };
  }
  snapshot(): readonly ResourceSnapshot[] { const result: ResourceSnapshot[] = []; for (const value of this.#values.values()) { this.scan('resource', 1); result.push({ ...value }); } return result; }
}

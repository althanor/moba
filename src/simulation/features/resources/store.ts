import { noScan, visits } from '../../shared/work';
import type { Scan } from '../../shared/work';
import { finite } from '../../../foundation/index';
import type { ContentId, ResourceDef, ResourceSnapshot } from '../../../contracts/index';

export class ResourceStore {
  readonly #reservations = new Map<string, { id: ContentId; amount: number }>();
  readonly #totals = new Map<ContentId, number>();
  readonly #values = new Map<ContentId, ResourceSnapshot>();
  constructor(defs: readonly ResourceDef[], maximum: (id: ContentId) => number, readonly scan: Scan = noScan,readonly lookup:()=>void=()=>{}) {
    for (const d of visits(defs, this.scan, 'resource')) { const max = maximum(d.maximumAttribute); this.#values.set(d.id, { id: d.id, current: Math.min(d.initial, max), maximum: max }); }
  }
  get(id: ContentId): ResourceSnapshot { this.lookup();const v = this.#values.get(id); if (!v) throw new Error(`resource:${id}`); return { ...v }; }
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
    if (mode === 'spend' && amount > v.current - this.reserved(id)) return { before: v.current, after: v.current, reason: 'insufficientResource' };
    const after = mode === 'gain' ? Math.min(v.maximum, v.current + amount) : v.current - amount;
    this.set(id, after); return { before: v.current, after, reason: null };
  }
  reserved(id: ContentId,lookup:()=>void=this.lookup): number { lookup();return this.#totals.get(id) ?? 0; }
  reservation(key: string): number { return this.#reservations.get(key)?.amount ?? 0; }
  action(id: ContentId, amount: number, mode: 'reserve' | 'spend' | 'commit' | 'release' | 'refund', key: string,lookup:()=>void=this.lookup): string | null {
    lookup();const v = this.get(id), old = this.#reservations.get(key);
    if (mode === 'reserve') {
      if (old || amount > v.current-this.reserved(id,lookup)) return 'insufficientResource';
      this.#reservations.set(key,{id,amount}); this.#totals.set(id,this.reserved(id,lookup)+amount); return null;
    }
    if (mode === 'commit' || mode === 'release') {
      if (!old || old.id !== id) return 'reservationAbsent';
      if (mode === 'commit' && old.amount > v.current) return 'insufficientResource';
      this.#reservations.delete(key); this.#totals.set(id,this.reserved(id,lookup)-old.amount);
      if (mode === 'commit') this.set(id,v.current-old.amount); return null;
    }
    return this.change(id,amount,mode === 'refund' ? 'gain' : 'spend').reason;
  }
  reservations(){const result=[];for(const [key,value] of this.#reservations){this.scan('resource',1);result.push({key,...value});}return result;}
  snapshot(): readonly ResourceSnapshot[] { const result: ResourceSnapshot[] = []; for (const value of this.#values.values()) { this.scan('resource', 1); result.push({ ...value }); } return result; }
}

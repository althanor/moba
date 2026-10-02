import { canonical, checkedAdd, deepFreeze } from '../../foundation/index';
import { WORK_KEYS, zeroWork } from '../../contracts/index';
import type { CapacityActual, CapacityCertificate, CombatFaultDiagnostic, ContentId, EngineCapacityProfile, Operation, RootCertificate, WorkKey } from '../../contracts/index';

export class CombatFault extends Error {
  constructor(readonly diagnostic: CombatFaultDiagnostic) { super(`${diagnostic.code}:${diagnostic.message}`); }
}
type MutableWork = { -readonly [K in WorkKey]: number };
export class CapacityGuard {
  #tick: MutableWork = { ...zeroWork() }; #maintenance: MutableWork = { ...zeroWork() };
  #roots: { rootId: string; effect: ContentId; producer: ContentId; work: MutableWork }[] = [];
  #producers = new Map<ContentId, number>();
  #current: { rootId: string; effect: ContentId; producer: ContentId; work: MutableWork } | null = null;
  #rootCertificate: RootCertificate | null = null;
  #operations = new Map<string, Operation>();
  operation: Operation | null = null;
  phase = 'P0';
  #attempt: { readonly rootId: string; readonly producer: ContentId } | null = null;
  readonly #rootIds = new Set<string>();
  readonly #scanKinds: Record<string, number> = {};
  readonly indexes: ReturnType<typeof prepareCapacity>;
  constructor(readonly certificate: CapacityCertificate, readonly profile: EngineCapacityProfile, readonly tickIndex: number, readonly scope: 'tick' | 'startup' | 'command' = 'tick', indexes?: ReturnType<typeof prepareCapacity>) {
    this.indexes = indexes ?? prepareCapacity(certificate, n => this.scan('maintenance', n));
  }
  scan(kind: string, count = 1): void { if (!count) return; this.charge('scans', count); this.#scanKinds[kind] = checkedAdd(this.#scanKinds[kind] ?? 0, count); }
  structure(value: unknown): void { let count = 0; deepFreeze(value, n => count += n); this.charge('structure', count); }
  freeze<T>(value: T, reuseFrozen = true): Readonly<T> { let count = 0; const frozen = deepFreeze(value, n => count += n, reuseFrozen); this.charge('structure', count); return frozen; }
  fault(code: string, message: string, actual: number | null = null, certificate: number | null = null, limit: number | null = null): never {
    throw new CombatFault(deepFreeze({ code, message, tick: this.tickIndex, phase: this.phase, rootId: this.#current?.rootId ?? this.#attempt?.rootId ?? null, opId: this.operation?.opId ?? null, producer: this.operation?.producer ?? this.#current?.producer ?? this.#attempt?.producer ?? null, chain: [...(this.operation?.chain ?? [])], actual, certificate, limit }));
  }
  begin(rootId: string, effect: ContentId, producer: ContentId): void {
    this.#attempt = { rootId, producer };
    if (this.#current) this.fault('ROOT_ACTIVE', rootId);
    if (this.#rootIds.has(rootId)) this.fault('ROOT_ID_CONFLICT', rootId);
    this.charge('lookups', 2);
    const entry = this.indexes.producer(producer), p = entry?.certificate, c = this.indexes.root(effect);
    if (!p || !c) this.fault('UNPROVEN_ROOT', `${producer}:${effect}`);
    if (!entry?.allows(effect)) this.fault('PRODUCER_EFFECT_MISMATCH', `${producer}:${effect}`);
    const actual = checkedAdd(this.#producers.get(producer) ?? 0, 1);
    if (actual > p.maxRoots) this.fault('PRODUCER_CAPACITY', producer, actual, p.maxRoots, this.certificate.rootCountLimit);
    if (this.#roots.length + 1 > this.certificate.rootCount) this.fault('ROOT_COUNT', rootId, this.#roots.length + 1, this.certificate.rootCount, this.certificate.rootCountLimit);
    this.#rootIds.add(rootId); this.#producers.set(producer, actual); this.#current = { rootId, effect, producer, work: { ...zeroWork() } }; this.#roots.push(this.#current); this.#rootCertificate = c; this.#attempt = null;
  }
  end(): void { this.#current = null; this.#rootCertificate = null; this.operation = null; this.#operations.clear(); }
  deduplicate(operation: Operation): boolean {
    const old = this.#operations.get(operation.opId);
    if (old !== undefined) { let work = 0; const same = canonical(old, n => work += n) === canonical(operation, n => work += n); this.charge('structure', work); if (!same) this.fault('OP_ID_CONFLICT', operation.opId); return false; }
    this.#operations.set(operation.opId, operation); return true;
  }
  #check(key: WorkKey, actual: number, bound: number, limit: number, context: string): void {
    if (actual > limit) this.fault('FAULT_LIMIT', `${context}.${key}`, actual, bound, limit);
    if (actual > bound) this.fault('CERTIFICATE_VIOLATION', `${context}.${key}`, actual, bound, limit);
  }
  charge(key: WorkKey, count = 1): void {
    const tickValue = checkedAdd(this.#tick[key], count);
    const bound = this.scope === 'tick' ? this.certificate.tick : this.certificate[this.scope], limit = this.scope === 'tick' ? this.certificate.limit : this.certificate[this.scope === 'startup' ? 'startupLimit' : 'commandLimit'];
    this.#check(key, tickValue, bound[key], limit[key], this.scope);
    if (this.#current && this.#rootCertificate) {
      const value = checkedAdd(this.#current.work[key], count);
      this.#check(key, value, this.#rootCertificate.work[key], this.#rootCertificate.limit[key], 'root'); this.#current.work[key] = value;
    } else {
      const value = checkedAdd(this.#maintenance[key], count);
      this.#check(key, value, this.scope === 'tick' ? this.certificate.maintenance[key] : bound[key], limit[key], 'maintenance'); this.#maintenance[key] = value;
    }
    this.#tick[key] = tickValue;
  }
  snapshot(): CapacityActual {
    for (const key of WORK_KEYS) if (this.#tick[key] > (this.scope === 'tick' ? this.profile.capacity : this.profile[this.scope])[key]) this.fault('PROFILE', key);
    const materialize = () => ({ scope: this.scope, scanKinds: { ...this.#scanKinds }, tick: { ...this.#tick }, roots: this.#roots.map(r => ({ ...r, work: { ...r.work } })), producers: this.certificate.producers.map(p => ({ id: p.id, roots: this.#producers.get(p.id) ?? 0 })), rootCount: this.#roots.length });
    let nodes = 0; deepFreeze(materialize(), count => nodes += count);
    this.charge('structure', 2 * nodes); return deepFreeze(materialize());
  }
}

/** Built once per runtime; no authority iteration or mutator is exposed. */
export function prepareCapacity(c: CapacityCertificate, visit: (n: number) => void = () => {}) {
  const roots = new Map(c.roots.map(root => { visit(1); return [root.effect, root] as const; }));
  const producers = new Map(c.producers.map(certificate => { visit(1); const effects = new Set<ContentId>(); for (const id of certificate.provenEffects) { visit(1); effects.add(id); } return [certificate.id, { certificate, allows: (id: ContentId) => effects.has(id) }] as const; }));
  return Object.freeze({ root: (id: ContentId) => roots.get(id), producer: (id: ContentId) => producers.get(id) });
}

import { noScan, ordered, visits } from '../../shared/work';
import type { Scan } from '../../shared/work';
import { finite } from '../../../foundation/index';
import type { DamageBreakdown, DamageType, EntityRef, FormulaStage, Leaf } from '../../../contracts/index';
import { resistanceMultiplier } from '../../shared/formulas/registry';

export interface ShieldState { readonly instanceId: number; readonly remaining: number; readonly priority: number; readonly endTick: number; readonly damageTypes: readonly DamageType[]; readonly source: EntityRef }
export interface DamagePlan {
  readonly hpAfter: number; readonly shields: readonly ShieldState[]; readonly broken: readonly number[];
  readonly deathSaveInstance: number | null; readonly breakdown: DamageBreakdown;
}
export function damagePlan(raw: number, scale: number, type: DamageType, resistance: number, hp: number, shields: readonly ShieldState[], protection: { readonly instanceId: number; readonly minimumHealth: number } | null, participants: readonly string[], scan: Scan = noScan): DamagePlan {
  if (raw < 0 || scale < 0) throw new RangeError('negative damage');
  const stages: FormulaStage[] = [{ stage: 'D1.raw', value: raw }, { stage: 'D2.outgoing', value: raw }, { stage: 'D3.cap', value: raw }, { stage: 'D4.hook', value: finite(raw * scale, 'D4') }];
  const resolved = finite(raw * scale * (type === 'true' ? 1 : resistanceMultiplier(resistance)), 'D5.damage');
  stages.push({ stage: 'D5.resistance', value: resolved }, { stage: 'D6.incoming', value: resolved });
  let remaining = resolved, absorbed = 0;
  const broken: number[] = [], next: ShieldState[] = [];
  const sorted = ordered(shields, (a, b) => b.priority - a.priority || a.endTick - b.endTick || a.instanceId - b.instanceId, scan);
  for (const shield of visits(sorted, scan, 'shield')) {
    let matches = false; for (const damageType of visits(shield.damageTypes, scan, 'shield')) if (damageType === type) matches = true;
    const amount = matches ? Math.min(remaining, shield.remaining) : 0;
    remaining -= amount; absorbed += amount;
    if (shield.remaining - amount > 0) next.push({ ...shield, remaining: shield.remaining - amount });
    else broken.push(shield.instanceId);
  }
  stages.push({ stage: 'D7.afterShield', value: remaining });
  let hpAfter = Math.max(0, hp - remaining), deathSaveInstance: number | null = null;
  const reasons: string[] = absorbed > 0 ? ['shieldAbsorbed'] : [];
  if (hpAfter === 0 && protection) { hpAfter = Math.min(hp, protection.minimumHealth); deathSaveInstance = protection.instanceId; reasons.push('deathSave'); }
  const hpDamage = hp - hpAfter, prevented = deathSaveInstance === null ? 0 : Math.min(remaining, hp) - hpDamage;
  stages.push({ stage: 'D8.hpDamage', value: hpDamage }, { stage: 'D8.deathSavePrevented', value: prevented });
  return { hpAfter, shields: next, broken, deathSaveInstance, breakdown: { rawDamage: raw, resolvedDamage: resolved, shieldAbsorbed: absorbed, hpDamage, resourceSpent: 0, preventedByResource: 0, extraHealthDamage: 0, overkill: Math.max(0, remaining - hp), stages, reasons, participants } };
}
export class VitalityStore {
  constructor(readonly scan: Scan = noScan) {}
  #life: 'alive' | 'pendingDeath' | 'dead' = 'alive';
  #shields: ShieldState[] = [];
  #deathSequence = 0;
  get life(): 'alive' | 'pendingDeath' | 'dead' { return this.#life; }
  get deathSequence(): number { return this.#deathSequence; }
  shields(): readonly ShieldState[] { const result: ShieldState[] = []; for (const s of visits(this.#shields, this.scan, 'shield')) { this.scan('shield', s.damageTypes.length); result.push({ ...s, source: { ...s.source }, damageTypes: s.damageTypes.slice() }); } return result; }
  commitDamage(plan: DamagePlan): void { this.scan('shield', plan.shields.length); this.#shields = plan.shields.slice(); if (plan.hpAfter === 0) this.#life = 'pendingDeath'; }
  addShield(payload: Extract<Leaf, { kind: 'shield' }>, amount: number, tick: number, instanceId: number, source: EntityRef, capacity: number): string | null {
    if (this.#shields.length >= capacity) return 'shieldCapacity';
    this.scan('shield', payload.damageTypes.length); if (amount > 0) this.#shields.push({ instanceId, remaining: amount, priority: payload.priority, endTick: tick + payload.durationTicks, damageTypes: [...payload.damageTypes], source: { ...source } }); return null;
  }
  expire(instanceId: number): void { this.#shields = this.#shields.filter(s => { this.scan('shield', 1); return s.instanceId !== instanceId; }); }
  confirmDeath(): boolean { if (this.#life !== 'pendingDeath') return false; this.#life = 'dead'; this.#deathSequence++; return true; }
}

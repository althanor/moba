import { finite } from '../../foundation/index';
import type { CombatFact, CompiledCatalog, DamageBreakdown, FormulaStage, Operation } from '../../contracts/index';
import type { CapacityGuard } from '../kernel/capacity-guard';
import { damagePlan } from '../features/combat/settlement';
import { attribute, refresh, statusDefs, traces } from './combat-state';
import { noScan, ordered, visits } from '../shared/work';
import type { Scan } from '../shared/work';
import type { RuntimeDefinitions } from '../kernel/definition-index';
import type { RuntimeEntityIndex } from './entity-index';
import type { RuntimeEntity } from './combat-state';
import { evaluateExpression } from '../shared/formulas/registry';

export interface DispatchContext {
  readonly definitions: RuntimeDefinitions; readonly entityIndex: RuntimeEntityIndex; readonly catalog: CompiledCatalog; readonly entities: readonly RuntimeEntity[]; readonly guard: CapacityGuard;
  readonly nextInstance: () => number;
  readonly emit: (fact: Omit<CombatFact, 'eventId' | 'tick' | 'phase'>) => void;
}
export function numericInput(context: DispatchContext, operation: Operation, source: RuntimeEntity, target: RuntimeEntity): { readonly value: number; readonly stages: readonly FormulaStage[]; readonly participants: readonly string[] } {
  if (!('formula' in operation.payload)) return { value: 0, stages: [], participants: [] };
  traces(context.catalog, context.definitions, source, context.guard); traces(context.catalog, context.definitions, target, context.guard);
  const f = context.definitions.formulas.get(operation.payload.formula, context.guard);
  const stages: FormulaStage[] = [], recorded = new Set<string>();
  function recordAttributes(subject: 'source' | 'target', id: typeof f.id): void {
    const entity = subject === 'source' ? source : target, pending = [id];
    while (pending.length) {
      context.guard.scan('diagnostic'); const current = pending.pop(); if (!current) continue;
      const key = `${subject}:${current}`; if (recorded.has(key)) continue;
      recorded.add(key); context.guard.charge('lookups'); const trace = entity.attributes.read(current);
      if (!trace) return context.guard.fault('ATTRIBUTE_TRACE', key);
      context.guard.scan('diagnostic', 6);
      for (const field of ['baseGrowthFlat', 'additivePercent', 'multiplied', 'overridden', 'converted', 'final'] as const) stages.push({ stage: `attribute:${key}.${field}`, value: trace[field] });
      const conversion = context.definitions.attributes.get(current, context.guard).conversion;
      const nodes = conversion ? [conversion] : [];
      while (nodes.length) {
        const node = nodes.pop(); if (!node) continue; context.guard.scan('diagnostic');
        if (node.kind === 'attribute') pending.push(node.id);
        else if ('left' in node) nodes.push(node.right, node.left);
      }
    }
  }
  const result = evaluateExpression(f.expression, { read(id, stage, subject) {
    recordAttributes(subject, id); return attribute(subject === 'source' ? source : target, id, context.guard, stage);
  } }, () => context.guard.charge('formula'), `formula:${f.id}`, (path, value) => stages.push({ stage: path, value }));
  if (result < 0) context.guard.fault('FORMULA_RANGE', `${f.id}:negative amount`);
  const participants: string[] = [];
  if (recorded.size) for (const [subject, entity] of [['source', source], ['target', target]] as const) for (const status of statusDefs(context.definitions, entity, context.guard)) {
    context.guard.scan('diagnostic');
    if (status.definition.contributions.some(c => { context.guard.scan('diagnostic'); return recorded.has(`${subject}:${c.attribute}`); })) participants.push(`modifier:${subject}:${status.definition.id}:${status.instanceId}`);
  }
  return { value: result, stages, participants };
}
export function blockedBreakdown(raw: number, reason: string, participants: readonly string[], inputStages: readonly FormulaStage[] = [], scan: Scan = noScan): DamageBreakdown {
  scan('diagnostic', inputStages.length + participants.length);
  return { rawDamage: raw, resolvedDamage: 0, shieldAbsorbed: 0, hpDamage: 0, resourceSpent: 0, preventedByResource: 0, extraHealthDamage: 0, overkill: 0, stages: [...inputStages, { stage: 'D1.raw', value: raw }, { stage: 'D4.blocked', value: 0 }], reasons: [reason], participants: participants.slice() };
}
/** Returns whether the leaf committed; ordinary rejected attempts do not run Post hooks. */
export function dispatch(context: DispatchContext, operation: Operation, target: RuntimeEntity, raw: number, scale: number, participants: readonly string[], inputStages: readonly FormulaStage[] = []): boolean {
  const { catalog, guard, definitions } = context, scan = guard.scan.bind(guard), r = catalog.document.ruleset, payload = operation.payload;
  const hp = target.resources.get(r.health).current;
  const emit = (kind: string, before: number, after: number, reason: string | null = null, breakdown: DamageBreakdown | null = null): void => context.emit({ kind, operation, target: target.ref, before, after, reason, breakdown });
  switch (payload.kind) {
    case 'damage': {
      const statuses = statusDefs(definitions, target, guard), immune = statuses.some(s => { scan('status', 1); return s.definition.tags.some(tag => { scan('status', 1); return tag === 'invulnerable' || tag === `immune:${payload.damageType}`; }); });
      if (immune) { emit('OperationRejected', hp, hp, 'immune', blockedBreakdown(raw, 'immune', participants, inputStages, scan)); return false; }
      const protection = ordered(statuses.filter(s => { scan('status', 1); return s.definition.deathSaveHealth !== null; }), (a, b) => a.definition.id < b.definition.id ? -1 : a.definition.id > b.definition.id ? 1 : a.instanceId - b.instanceId, scan)[0];
      traces(catalog, definitions, target, guard);
      scan('diagnostic', participants.length); const damageParticipants = participants.slice();
      for (const status of visits(statuses, scan, 'diagnostic')) if (status.definition.contributions.length) damageParticipants.push(`modifier:${status.definition.id}:${status.instanceId}`);
      const plan = damagePlan(raw, scale, payload.damageType, attribute(target, payload.damageType === 'magic' ? r.magicResistance : r.armor, guard), hp, target.vitality.shields(), protection && protection.definition.deathSaveHealth !== null ? { instanceId: protection.instanceId, minimumHealth: protection.definition.deathSaveHealth } : null, damageParticipants, scan);
      // All potentially failing computation and validation precedes these synchronous fixed-field commits.
      target.resources.set(r.health, plan.hpAfter); target.vitality.commitDamage(plan);
      if (plan.deathSaveInstance !== null) { target.statuses.remove(plan.deathSaveInstance); refresh(catalog, definitions, target, guard); }
      const finalHp = target.resources.get(r.health).current;
      scan('diagnostic', inputStages.length + plan.breakdown.stages.length);
      const traced = { ...plan.breakdown, stages: [...inputStages, ...plan.breakdown.stages] };
      if (finalHp !== plan.hpAfter) scan('diagnostic', traced.stages.length + traced.reasons.length);
      const breakdown = finalHp === plan.hpAfter ? traced : { ...traced, stages: [...traced.stages, { stage: 'D8.maximumClamp', value: plan.hpAfter - finalHp }], reasons: [...traced.reasons, 'maximumClampIsNotDamage'] };
      emit('DamageResolved', hp, finalHp, null, breakdown);
      if (finalHp !== plan.hpAfter) emit('ResourceClamped', plan.hpAfter, finalHp, 'maximumChanged');
      for (const instance of visits(plan.broken, scan, 'shield')) emit('ShieldBroken', instance, 0);
      if (plan.deathSaveInstance !== null) emit('DeathSaveConsumed', plan.deathSaveInstance, 0);
      return true;
    }
    case 'heal': { const result = target.resources.change(r.health, finite(raw * scale, 'heal'), 'gain'); emit('HealResolved', result.before, result.after, result.reason); return true; }
    case 'resource': {
      if (payload.resource === r.health && payload.mode === 'spend') { emit('OperationRejected', hp, hp, 'HealthSpendRequiresDamage'); return false; }
      const result = target.resources.change(payload.resource, finite(raw * scale, 'resource'), payload.mode); emit('ResourceResolved', result.before, result.after, result.reason); return result.reason === null;
    }
    case 'shield': { const reason = target.vitality.addShield(payload, finite(raw * scale, 'shield'), guard.tickIndex, context.nextInstance(), operation.sourceRef, r.maxShieldsPerEntity); emit('ShieldGranted', 0, reason ? 0 : raw * scale, reason); return reason === null; }
    case 'applyStatus': {
      const d = definitions.modifiers.get(payload.modifier, guard);
      const statuses = statusDefs(definitions, target, guard);
      if (d.control !== 'none' && statuses.some(s => { scan('status', 1); return s.definition.tags.some(tag => { scan('status', 1); return tag === `immune:${d.control}`; }); })) { emit('OperationRejected', 0, 0, 'controlImmune'); return false; }
      let total = 0; for (const entity of visits(context.entities, scan, 'status')) total += entity.statuses.count;
      const reason = target.statuses.apply(d, operation.sourceRef, guard.tickIndex, context.nextInstance(), r.maxStatusesPerEntity, total < r.maxStatusesGlobal);
      if (!reason) refresh(catalog, definitions, target, guard);
      emit('ModifierApplied', 0, reason ? 0 : 1, reason); return reason === null;
    }
    case 'removeStatus': {
      const matches = target.statuses.matching(payload.modifier);
      for (const status of visits(matches, scan, 'status')) { target.statuses.remove(status.instanceId); emit('ModifierRemoved', status.instanceId, 0); }
      refresh(catalog, definitions, target, guard); if (!matches.length) emit('OperationRejected', 0, 0, 'statusAbsent'); return matches.length > 0;
    }
  }
}

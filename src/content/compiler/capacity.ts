import { checkedAdd, checkedMultiply, dataHash, deepFreeze, powerOfTwo } from '../../foundation/index';
import { WORK_KEYS, M2_COMMAND_LIMITS, addWork, limitWork, maxWork, scaleWork, zeroWork } from '../../contracts/index';
import type { CapacityCertificate, ContentDocument, ContentId, EffectNode, Expression, Work } from '../../contracts/index';
import { expressionNodes, requireId } from './graphs';

export const ENGINE_VERSION = '0.3.1';
export const COMPILER_VERSION = 'm2-indexed-v2';
/** Bound for the explicit stable merge sort in simulation/shared/work.ts. */
export function sortCost(n: number): number { return n ? checkedMultiply(n, 1 + 2 * Math.ceil(Math.log2(n))) : 0; }
export function attributeCost(d: ContentDocument): { readonly formula: number; readonly scans: number; readonly lookups: number } {
  const formula = d.attributes.reduce((n, a) => checkedAdd(n, a.conversion ? expressionNodes(a.conversion) : 0), 0);
  const C = checkedMultiply(d.ruleset.maxStatusesPerEntity, Math.max(0, ...d.modifiers.map(m => m.contributions.length))), A = d.attributes.length, S = d.ruleset.maxStatusesPerEntity;
  // Collect status/contribution sources; merge order; three attribute passes,
  // multiply-factor pass; trace-index construction. Each pass is separately counted.
  return { formula, scans: checkedAdd(4 * A + 2 * S + 2 * C, checkedAdd(A * C, sortCost(C))), lookups: checkedAdd(S + 3 * A, formula) };
}
export function proveCapacity(d: ContentDocument, contentHash: string, tickRate: number): CapacityCertificate {
  const r = d.ruleset, cost = attributeCost(d);
  const hookInstances = d.modifiers.reduce((n, m) => checkedAdd(n, checkedMultiply(m.hooks.length, Math.min(m.maxInstancesPerEntity, r.maxStatusesPerEntity))), 0);
  const maxFormula = Math.max(0, ...d.formulas.map(f => expressionNodes(f.expression)));
  const readsAttribute = (expr: Expression): boolean => expr.kind === 'attribute' || ('left' in expr && (readsAttribute(expr.left) || readsAttribute(expr.right)));
  const A = d.attributes.length, S = r.maxStatusesPerEntity, Q = r.maxShieldsPerEntity, R = d.resources.length;
  const C = Math.max(0, ...d.modifiers.map(m => m.contributions.length)), T = Math.max(0, ...d.modifiers.map(m => m.tags.length));
  const H = hookInstances;
  let effectTags = 0, shieldTypes = 0;
  function shape(n: EffectNode): void {
    if (n.kind === 'shield') shieldTypes = Math.max(shieldTypes, n.damageTypes.length);
    if ('child' in n) shape(n.child); if ('children' in n) n.children.forEach(shape); if (n.kind === 'conditional') { shape(n.yes); shape(n.no); }
  }
  for (const e of d.effects) { effectTags = Math.max(effectTags, e.tags.length); shape(e.node); }
  const diagnosticScans = d.formulas.some(f => readsAttribute(f.expression)) ? 2 * (7 * A + 2 * cost.formula + 3 * S + S * C) + maxFormula : 0;
  // Union of all supported leaf paths; no average/branch discount:
  // four possible dirty attribute rebuilds/refreshes; status copies, tags,
  // matching/removal; hook collection/order/pre/post/chain; shield copy/order/
  // absorption/commit; formula/participant copies; global status count.
  const leafPass = checkedAdd(4 * (cost.scans + R), checkedAdd(
    14 * S + 2 * S * S + 2 * S * T + sortCost(S) + r.maxUnits,
    checkedAdd(H * (4 + 2 * r.maxHookDepth) + sortCost(H),
      4 * Q + 2 * Q * shieldTypes + sortCost(Q) + diagnosticScans + (H + 2) * (maxFormula + 12 * A + 10 + H + 3 * S) + 4 * H + 8 * S)));
  // Maximum immutable Fact tree: outer record, Operation fields/Refs/tags/
  // chain/payload, and breakdown scalars/arrays/formula+attribute stages.
  const stageCount = maxFormula + 12 * A + 10, participantCount = H + 3 * S;
  const factNodes = 13 + 24 + effectTags + r.maxHookDepth + 8 + shieldTypes + 14 + 3 * stageCount + 4 + participantCount;
  const factStructure = checkedMultiply(4, factNodes); // two reads per unfrozen edge + P9 frozen-record visit + archive delivery.
  const maxStringLength = 96 + 16 + 96 + 16 + 32 + 16 + 16 * 8; // match/producer/safe-integer IDs, suffixes, deepest formula path.
  interface Parts { readonly base: number; readonly replacement: number; readonly derived: number }
  const partsMemo = new Map<string, Parts>();
  const addParts = (a: Parts, b: Parts): Parts => ({ base: checkedAdd(a.base, b.base), replacement: checkedAdd(a.replacement, b.replacement), derived: checkedAdd(a.derived, b.derived) });
  const multiplyParts = (a: Parts, n: number): Parts => ({ base: checkedMultiply(a.base, n), replacement: checkedMultiply(a.replacement, n), derived: checkedMultiply(a.derived, n) });
  function partsEffect(id: ContentId, depth: number): Parts {
    const key = `${id}:${depth}`, found = partsMemo.get(key); if (found) return found;
    const result = partsNode(requireId(d.effects, id, 'capacity.parts').node, depth); partsMemo.set(key, result); return result;
  }
  function partsNode(n: EffectNode, depth: number): Parts {
    const zero: Parts = { base: 0, replacement: 0, derived: 0 };
    if (n.kind === 'sequence') return n.children.reduce((p, child) => addParts(p, partsNode(child, depth)), zero);
    if (n.kind === 'repeat') return multiplyParts(partsNode(n.child, depth), n.count);
    if (n.kind === 'targets') return multiplyParts(partsNode(n.child, depth), n.selector === 'source' ? 1 : r.maxUnits);
    if (n.kind === 'conditional') { const a = partsNode(n.yes, depth), b = partsNode(n.no, depth); return { base: Math.max(a.base, b.base), replacement: Math.max(a.replacement, b.replacement), derived: Math.max(a.derived, b.derived) }; }
    let result: Parts = { ...zero, base: 1 };
    if (depth < r.maxHookDepth) for (const m of d.modifiers) for (const h of m.hooks) if (h.match === n.kind && 'effect' in h.action) {
      const child = partsEffect(h.action.effect, depth + 1), total = checkedAdd(child.base, checkedAdd(child.replacement, child.derived));
      const expansion: Parts = h.action.kind === 'replace' ? { base: 0, replacement: checkedAdd(child.base, child.replacement), derived: child.derived } : { base: 0, replacement: 0, derived: total };
      result = addParts(result, multiplyParts(expansion, Math.min(m.maxInstancesPerEntity, r.maxStatusesPerEntity)));
    }
    return result;
  }
  const memo = new Map<string, Work>();
  function effect(id: ContentId, depth: number): Work {
    const key = `${id}:${depth}`, found = memo.get(key); if (found) return found;
    const work = node(requireId(d.effects, id, 'capacity').node, depth), parts = partsEffect(id, depth);
    const result = { ...work, lookups: checkedAdd(work.lookups, 2), operations: checkedAdd(parts.base, checkedAdd(parts.replacement, parts.derived)), scans: checkedAdd(work.scans, work.facts) }; memo.set(key, result); return result;
  }
  function node(n: EffectNode, depth: number): Work {
    let result: Work = { ...zeroWork(), ast: 1 };
    switch (n.kind) {
      case 'sequence': result = { ...result, scans: n.children.length }; for (const child of n.children) result = addWork(result, node(child, depth)); return result;
      case 'repeat': return addWork({ ...result, ast: checkedAdd(1, n.count) }, scaleWork(node(n.child, depth), n.count));
      case 'targets': {
        const fanout = n.selector === 'source' ? 1 : r.maxUnits;
        return addWork({ ...result, queries: 1, scans: 2 * fanout }, scaleWork(node(n.child, depth), fanout));
      }
      case 'conditional': return addWork({ ...result, formula: cost.formula, scans: cost.scans, lookups: cost.lookups + 2 }, maxWork(node(n.yes, depth), node(n.no, depth)));
      default: {
        const facts = checkedAdd(3, checkedAdd(Q, checkedAdd(S, H)));
        result = { ...result, operations: 1, formula: checkedAdd(maxFormula, checkedMultiply(6, cost.formula)), scans: leafPass,
          lookups: checkedAdd(8 + maxFormula + 6 * S + 2 * A + 4 * R, checkedMultiply(4, cost.lookups)),
          structure: checkedMultiply(facts, factStructure), facts };

        if (depth < r.maxHookDepth) for (const m of d.modifiers) for (const h of m.hooks.filter(h => h.match === n.kind)) {
          const instances = Math.min(m.maxInstancesPerEntity, r.maxStatusesPerEntity);
          result = addWork(result, { ...zeroWork(), hooks: instances });
          if ('effect' in h.action) result = addWork(result, scaleWork(effect(h.action.effect, depth + 1), instances));
        }
        return result;
      }
    }
  }
  const roots = d.effects.map(e => {
    const work = effect(e.id, 0), parts = partsEffect(e.id, 0), F_e = e.node.kind === 'targets' && e.node.selector !== 'source' ? r.maxUnits : 1;
    const fanoutSegments: { path: string; selector: string; maximumTargets: number }[] = [];
    function segments(n: EffectNode, path: string): void {
      if (n.kind === 'targets') fanoutSegments.push({ path, selector: n.selector, maximumTargets: n.selector === 'source' ? 1 : r.maxUnits });
      if ('child' in n) segments(n.child, `${path}.child`);
      if ('children' in n) n.children.forEach((child, i) => segments(child, `${path}[${i}]`));
      if (n.kind === 'conditional') { segments(n.yes, `${path}.yes`); segments(n.no, `${path}.no`); }
    }
    segments(e.node, e.id);
    return { effect: e.id, work, limit: limitWork(work), maxPrimaryTargets: r.maxUnits, F_e, B_e: parts.base / F_e, R_e: parts.replacement / F_e, D_e: parts.derived / F_e, S_e: 0, fanoutSegments };
  });
  const producers = r.producers.map(p => {
    const maxRoots = checkedMultiply(p.maxInstances, p.rootsPerInstancePerTick);
    const rootWork = p.effects.reduce((work, id) => maxWork(work, effect(id, 0)), zeroWork());
    return { id: p.id, provenEffects: p.effects.slice(), kind: p.kind, maxInstances: p.maxInstances, rootsPerInstancePerTick: p.rootsPerInstancePerTick, maxRoots, work: scaleWork(rootWork, maxRoots) };
  });
  const shieldGlobal = checkedMultiply(r.maxUnits, r.maxShieldsPerEntity);
  const resourceUpdates = checkedMultiply(r.maxUnits, d.resources.length);
  const operations = checkedAdd(r.maxStatusesGlobal, checkedAdd(shieldGlobal, checkedAdd(resourceUpdates, r.maxUnits)));
  const rootCount = producers.reduce((n, p) => checkedAdd(n, p.maxRoots), 0);
  const entityNodes = 24 + 8 * A + 4 * R + 10 * S + 4 * Q + S * (T + 1);
  const E = M2_COMMAND_LIMITS, commandNodes = 12 + 3 * E.targets;
  const commandOrdering = sortCost(E.history + 1) + sortCost(E.targets);
  const ingressScans = (E.history + 1) * (E.pending + 1) + commandOrdering + 6 * E.pending + 3 * E.targets + 9;
  const command = { ...zeroWork(), scans: ingressScans, lookups: 2 + E.targets, structure: 8 * commandNodes * (maxStringLength + 32) };
  // P0/P6/P9 entity and component passes, removals may coincide. P1 queue/
  // history scheduling is bounded independently of root work; root ordering is
  // n copy + at most 2n reads per merge level, never uncharged native sort.
  const maintenancePass = checkedAdd(2 * r.maxUnits * (cost.scans + R),
    r.maxUnits * (4 + 8 * S + 2 * S * S + 3 * S * T + sortCost(S * (T + 1)) + 4 * Q + Q * Q + 2 * Q * shieldTypes + R) +
    2 * operations + sortCost(rootCount) + 2 * rootCount + E.pending * ingressScans + 4 * E.pending);
  const maintenance: Work = { ...zeroWork(), operations, facts: operations, formula: 2 * r.maxUnits * cost.formula, scans: maintenancePass,
    lookups: 2 * rootCount + r.maxUnits * (2 * cost.lookups + 6 * S + 2 * R + 1),
    structure: checkedAdd(operations * factStructure, checkedAdd(
      (r.maxUnits * entityNodes + 2 * E.pending * commandNodes + rootCount * (8 + 2 * WORK_KEYS.length) + producers.length * 4 + 64) * 4 * (maxStringLength + 32),
      E.pending * command.structure)) };
  const tick = producers.reduce((work, p) => addWork(work, p.work), maintenance);
  const data = { engineVersion: ENGINE_VERSION, compilerVersion: COMPILER_VERSION, contentHash, tickRate, rulesetId: r.id, roots, producers, maintenance, maintenanceEnvelope: { modifierEvents: r.maxStatusesGlobal, shieldEvents: shieldGlobal, resourceUpdates, deathEvents: r.maxUnits }, tick, limit: limitWork(tick), rootCount, rootCountLimit: powerOfTwo(rootCount), maxHookDepth: r.maxHookDepth, maxUnits: r.maxUnits, maxStatusesGlobal: r.maxStatusesGlobal, factQueue: 1, factQueueLimit: 1 };
  const definitions = d.effects.length + d.formulas.length + d.modifiers.length + A + R + producers.length;
  const scanModel = { version: 'element-read-v2', attributePass: cost.scans, leafPass, maintenancePass, factStructure, maxStringLength };
  // Binding hashes are measured using the same canonical traversal. Substitute
  // 16-digit safe-integer work values for startup's self-referential fields;
  // every legal actual value is shorter, with identical object/array shape.
  const widestWork = scaleWork({ operations: 1, hooks: 1, queries: 1, ast: 1, formula: 1, scans: 1, facts: 1, lookups: 1, structure: 1 }, Number.MAX_SAFE_INTEGER);
  let bindingWork = 0;
  dataHash({ tickRate, document: d }, n => bindingWork += n);
  dataHash({ ...data, startup: widestWork, startupLimit: widestWork, command, commandLimit: limitWork(command), scanModel }, n => bindingWork += n);
  // Deep verification/freezing of the actual catalog cannot trust a shallow frozen DTO.
  deepFreeze({ document: d, certificate: { ...data, startup: widestWork, startupLimit: widestWork, command, commandLimit: limitWork(command), scanModel } }, n => bindingWork += n, false);
  const startup = { ...zeroWork(), scans: definitions + (1 + WORK_KEYS.length) * d.effects.length + producers.reduce((n, p) => n + p.provenEffects.length + 1, 0) + r.maxUnits * (cost.scans + A + R + entityNodes + r.maxUnits), formula: r.maxUnits * cost.formula,
    lookups: r.maxUnits * (cost.lookups + 2 * A + R), structure: bindingWork + 2 * r.maxUnits * entityNodes * 4 * (maxStringLength + 32) };
  const extra = { startup, startupLimit: limitWork(startup), command, commandLimit: limitWork(command), scanModel };
  const complete = { ...data, ...extra };
  return { id: dataHash(complete), ...complete };

}

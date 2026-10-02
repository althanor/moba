import { compareId, finite } from '../../foundation/index';
import type { ContentDocument, ContentId, EffectNode, Expression, Unit } from '../../contracts/index';
import { ContentError } from '../validation/schema';

export function requireId<T extends { readonly id: ContentId }>(items: readonly T[], id: ContentId, path: string): T {
  const item = items.find(item => item.id === id); if (!item) throw new ContentError('REFERENCE', path, `missing ${id}`); return item;
}
export function expressionNodes(expr: Expression): number { return 'left' in expr ? 1 + expressionNodes(expr.left) + expressionNodes(expr.right) : 1; }
export function attributeReads(expr: Expression): readonly Extract<Expression, { kind: 'attribute' }>[] {
  return expr.kind === 'attribute' ? [expr] : 'left' in expr ? [...attributeReads(expr.left), ...attributeReads(expr.right)] : [];
}
interface Range { readonly unit: Unit; readonly lo: number; readonly hi: number }
export function validateExpression(expr: Expression, document: ContentDocument, path: string): Range {
  if (expressionNodes(expr) > 128) throw new ContentError('AST_CAPACITY', path, 'formula exceeds 128 nodes');
  function visit(node: Expression): Range {
    if (node.kind === 'constant') return { unit: node.unit, lo: node.value, hi: node.value };
    if (node.kind === 'attribute') {
      const attr = requireId(document.attributes, node.id, path);
      // Pre values have not been clamped: conservatively include every legal contribution and level 1..100.
      let lo = attr.min, hi = attr.max;
      if (node.stage === 'pre') {
        lo += Math.min(0, attr.growthPerLevel * 99); hi += Math.max(0, attr.growthPerLevel * 99);
        const contributions = document.modifiers.flatMap(m => m.contributions.filter(c => c.attribute === attr.id).map(c => ({ c, n: Math.min(m.maxInstancesPerEntity, document.ruleset.maxStatusesPerEntity) })));
        for (const { c, n } of contributions) if (c.bucket === 'flat') { lo = finite(lo + Math.min(0, c.value * n), path); hi = finite(hi + Math.max(0, c.value * n), path); }
        let percentLo = 1, percentHi = 1;
        for (const { c, n } of contributions) if (c.bucket === 'percent') { percentLo = finite(percentLo + Math.min(0, c.value * n), path); percentHi = finite(percentHi + Math.max(0, c.value * n), path); }
        let vals = [lo * percentLo, lo * percentHi, hi * percentLo, hi * percentHi]; lo = finite(Math.min(...vals), path); hi = finite(Math.max(...vals), path);
        for (const { c, n } of contributions) if (c.bucket === 'multiply') {
          const k = finite(c.value ** n, path); vals = [lo, hi, lo * k, hi * k]; lo = finite(Math.min(...vals), path); hi = finite(Math.max(...vals), path);
        }
        for (const { c } of contributions) if (c.bucket === 'override') { lo = Math.min(lo, c.value); hi = Math.max(hi, c.value); }
      }
      return { unit: attr.unit, lo: finite(lo, path), hi: finite(hi, path) };
    }
    const a = visit(node.left), b = visit(node.right); let unit: Unit = a.unit; let values: number[];
    if (node.kind === 'multiply') {
      if (a.unit !== 'scalar' && b.unit !== 'scalar') throw new ContentError('UNIT', path, 'cannot multiply two points quantities');
      unit = a.unit === 'scalar' ? b.unit : a.unit; values = [a.lo * b.lo, a.lo * b.hi, a.hi * b.lo, a.hi * b.hi];
    } else if (node.kind === 'divide') {
      if (b.lo <= 0 && b.hi >= 0) throw new ContentError('DIVIDE_ZERO', path, 'denominator envelope contains zero');
      if (b.unit !== 'scalar' && b.unit !== a.unit) throw new ContentError('UNIT', path, 'invalid division units');
      unit = b.unit === a.unit ? 'scalar' : a.unit; values = [a.lo / b.lo, a.lo / b.hi, a.hi / b.lo, a.hi / b.hi];
    } else {
      if (a.unit !== b.unit) throw new ContentError('UNIT', path, 'add/min/max require equal units');
      values = node.kind === 'add' ? [a.lo + b.lo, a.hi + b.hi] : node.kind === 'min' ? [Math.min(a.lo, b.lo), Math.min(a.hi, b.hi)] : [Math.max(a.lo, b.lo), Math.max(a.hi, b.hi)];
    }
    return { unit, lo: finite(Math.min(...values), path), hi: finite(Math.max(...values), path) };
  }
  return visit(expr);
}
export function validateGraphs(document: ContentDocument): readonly ContentId[] {
  if(!document.gameplay&&document.ruleset.producers.some(p=>['action','projectile','area','movement'].includes(p.kind)))throw new ContentError('GAMEPLAY','$.ruleset.producers','gameplay producer requires compiled gameplay');
  for (const [name, items] of Object.entries({ attributes: document.attributes, formulas: document.formulas, resources: document.resources, modifiers: document.modifiers, effects: document.effects, producers: document.ruleset.producers })) {
    const ids = items.map(item => item.id); if (new Set(ids).size !== ids.length) throw new ContentError('DUPLICATE_ID', name, 'duplicate stable ID');
  }
  const hooks = document.modifiers.flatMap(m => m.hooks); if (new Set(hooks.map(h => h.id)).size !== hooks.length) throw new ContentError('DUPLICATE_ID', 'hooks', 'hook IDs must be globally unique');
  for (const a of document.attributes) {
    if (a.base < a.min || a.base > a.max) throw new ContentError('ATTRIBUTE_RANGE', a.id, 'base outside declared input envelope');
    const pre = validateExpression({ kind: 'attribute', id: a.id, stage: 'pre', subject: 'source' }, document, a.id);
    if (a.conversion) { const conversion = validateExpression(a.conversion, document, a.id); finite(pre.lo + conversion.lo, a.id); finite(pre.hi + conversion.hi, a.id); }
  }
  const order: ContentId[] = [], active: ContentId[] = [], done = new Set<ContentId>();
  function visit(id: ContentId): void {
    if (done.has(id)) return;
    if (active.includes(id)) throw new ContentError('ATTRIBUTE_CYCLE', `attributes.${id}`, [...active, id].join(' -> '));
    active.push(id); const a = requireId(document.attributes, id, 'attributes');
    if (a.conversion) {
      if (validateExpression(a.conversion, document, `attributes.${id}.conversion`).unit !== a.unit) throw new ContentError('UNIT', id, 'conversion unit mismatch');
      for (const read of attributeReads(a.conversion)) { if (read.subject !== 'source') throw new ContentError('ATTRIBUTE_SCOPE', id, 'conversion must read self/source'); if (read.stage === 'final') visit(read.id); }
    }
    active.pop(); done.add(id); order.push(id);
  }
  for (const a of document.attributes.slice().sort((a, b) => compareId(a.id, b.id))) visit(a.id);
  for (const f of document.formulas) if (validateExpression(f.expression, document, `formulas.${f.id}`).unit !== f.unit) throw new ContentError('UNIT', f.id, 'formula unit mismatch');
  for (const r of document.resources) {
    const a = requireId(document.attributes, r.maximumAttribute, r.id);
    if (a.unit !== 'points' || a.min < 0) throw new ContentError('RESOURCE_RANGE', r.id, 'maximum must be nonnegative points');
  }
  const health = requireId(document.resources, document.ruleset.health, 'ruleset.health');
  if (health.initial <= 0) throw new ContentError('HEALTH_RANGE', health.id, 'initial Health must be positive');
  if (requireId(document.attributes, health.maximumAttribute, 'ruleset.health').min <= 0) throw new ContentError('HEALTH_RANGE', health.id, 'Health maximum must stay positive');
  requireId(document.attributes, document.ruleset.armor, 'ruleset.armor'); requireId(document.attributes, document.ruleset.magicResistance, 'ruleset.magicResistance');
  function node(n: EffectNode, path: string): void {
    if (['spatialTargets','displace','spawnArea','spawnProjectile'].includes(n.kind) && !document.gameplay) throw new ContentError('GAMEPLAY',path,'requires gameplay envelope');
    if ('formula' in n) {
      const f = requireId(document.formulas, n.formula, path);
      if (f.unit !== 'points') throw new ContentError('UNIT', path, 'resource amounts require points');
      const range = validateExpression(f.expression, document, path);
      if (range.lo < 0) throw new ContentError('FORMULA_RANGE', path, 'amount envelope can be negative');
      let maximum = range.hi;
      for (const m of document.modifiers) for (const h of m.hooks) if (h.match === n.kind && h.action.kind === 'scale' && h.action.factor > 1) maximum = finite(maximum * h.action.factor ** Math.min(m.maxInstancesPerEntity, document.ruleset.maxStatusesPerEntity), path);
    }
    if (n.kind === 'resource') requireId(document.resources, n.resource, path);
    if ('modifier' in n) requireId(document.modifiers, n.modifier, path);
    if (n.kind === 'conditional') { requireId(document.attributes, n.attribute, path); node(n.yes, path); node(n.no, path); }
    if ('child' in n) node(n.child, path);
    if ('children' in n) for (const child of n.children) node(child, path);
  }
  for (const e of document.effects) node(e.node, e.id);
  const r = document.ruleset;
  if (r.maxUnits > r.queryCapacity || r.maxStatusesGlobal > r.maxUnits * r.maxStatusesPerEntity) throw new ContentError('ENVELOPE', 'ruleset', 'inconsistent target/status envelope');
  for (const p of r.producers) {
    if (!p.effects.length) throw new ContentError('PRODUCER', p.id, 'producer needs supported Effects');
    for (const id of p.effects) requireId(document.effects, id, p.id);
    if (p.kind === 'fixture' && p.maxInstances > r.maxUnits) throw new ContentError('PRODUCER', p.id, 'fixture instances exceed unit envelope');
    if ((p.kind === 'statusPulse' || p.kind === 'statusEnd') && (p.maxInstances < r.maxStatusesGlobal || p.rootsPerInstancePerTick < 1)) throw new ContentError('PRODUCER', p.id, 'status producer must cover simultaneous global instances');
  }
  for (const m of document.modifiers) {
    for (const c of m.contributions) requireId(document.attributes, c.attribute, m.id);
    for (const h of m.hooks) if ('effect' in h.action) requireId(document.effects, h.action.effect, h.id);
    for (const [kind, event] of [['statusPulse', m.pulse], ['statusEnd', m.end]] as const) if (event) {
      requireId(document.effects, event.effect, m.id); const p = requireId(r.producers, event.producer, m.id);
      if (p.kind !== kind || !p.effects.includes(event.effect)) throw new ContentError('PRODUCER', m.id, `invalid ${kind} producer`);
    }
  }
  return order;
}
export function boundedTriggerCycles(document: ContentDocument): readonly { readonly path: readonly string[]; readonly maxHookDepth: number }[] {
  const graph = new Map<string, Set<string>>();
  function leaves(n: EffectNode): readonly string[] {
    if ('child' in n) return leaves(n.child);
    if ('children' in n) return n.children.flatMap(leaves);
    if (n.kind === 'conditional') return [...leaves(n.yes), ...leaves(n.no)];
    return [n.kind];
  }
  for (const m of document.modifiers) for (const h of m.hooks) if ('effect' in h.action) {
    const edges = graph.get(h.match) ?? new Set<string>();
    for (const kind of leaves(requireId(document.effects, h.action.effect, h.id).node)) edges.add(kind);
    graph.set(h.match, edges);
  }
  const cycles: string[][] = [], done = new Set<string>();
  function visit(id: string, path: readonly string[]): void {
    if (path.includes(id)) { cycles.push([...path.slice(path.indexOf(id)), id]); return; }
    if (done.has(id)) return;
    for (const target of [...(graph.get(id) ?? [])].sort()) visit(target, [...path, id]);
    done.add(id);
  }
  for (const id of [...graph.keys()].sort()) visit(id, []);
  return cycles.map(path => ({ path, maxHookDepth: document.ruleset.maxHookDepth }));
}

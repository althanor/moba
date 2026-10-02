import { ordered, visits } from '../shared/work';
import { compareId } from '../../foundation/index';
import type { ContentId, EffectNode, EntityRef, FormulaStage, HookDef, Operation } from '../../contracts/index';
import { attribute, traces } from './combat-state';
import { blockedBreakdown, dispatch, numericInput } from './operation-dispatch';
import type { DispatchContext } from './operation-dispatch';

export interface RootIntent {
  readonly rootId: string; readonly effect: ContentId; readonly producer: ContentId; readonly sourceRef: EntityRef;
  readonly targets: readonly EntityRef[]; readonly sourceSequence: number;
}
interface Frame {
  readonly node: EffectNode; readonly effect: ContentId; readonly target: EntityRef; readonly depth: number;
  readonly parentId: string | null; readonly chain: readonly string[];
  readonly repeatsLeft?: number;
}
interface HookInstance { readonly definition: HookDef; readonly instanceId: number; readonly key: string }
export function executeRoot(context: DispatchContext, root: RootIntent, nextOperation: () => number): void {
  const { catalog, entities, guard, definitions, entityIndex } = context, scan = guard.scan.bind(guard);
  const source = entityIndex.resolve(root.sourceRef, guard);
  const rootNode = definitions.effects.get(root.effect, guard).node;
  const stack: Frame[] = [{ node: rootNode, effect: root.effect, target: root.targets[0] ?? root.sourceRef, depth: 0, parentId: null, chain: [] }];
  const triggers = new Map<string, number>();

  function expansion(hook: HookInstance, op: Operation, frame: Frame): Frame {
    const action = hook.definition.action;
    if (!('effect' in action)) return guard.fault('HOOK_KIND', hook.key);
    guard.scan('hook', frame.chain.length);
    return { node: definitions.effects.get(action.effect, guard).node, effect: action.effect, target: frame.target, depth: frame.depth + 1, parentId: op.opId, chain: [...frame.chain, hook.key] };
  }
  while (stack.length) {
    const frame = stack.pop() ?? guard.fault('STACK', 'stack invariant');
    guard.charge('ast');
    if (frame.depth > catalog.document.ruleset.maxHookDepth) guard.fault('HOOK_DEPTH', root.rootId, frame.depth, catalog.document.ruleset.maxHookDepth, guard.profile.hookDepth);
    const node = frame.node;
    if (node.kind === 'sequence') { for (let i = node.children.length - 1; i >= 0; i--) { guard.scan('query'); const child = node.children[i]; if (child) stack.push({ ...frame, node: child }); } continue; }
    if (node.kind === 'repeat') {
      const remaining = frame.repeatsLeft ?? node.count;
      if (remaining > 0) { stack.push({ ...frame, repeatsLeft: remaining - 1 }); const { repeatsLeft: _remaining, ...child } = frame; void _remaining; stack.push({ ...child, node: node.child }); }
      continue;
    }
    if (node.kind === 'targets') {
      guard.charge('queries');
      const targets = node.selector === 'source' ? [root.sourceRef] : node.selector === 'all' ? entities.map(e => { guard.scan('query'); return e.ref; }) : root.targets;
      if (targets.length > catalog.document.ruleset.maxUnits || targets.length > guard.profile.queryTargets) guard.fault('TARGET_FANOUT', root.rootId, targets.length, catalog.document.ruleset.maxUnits, guard.profile.queryTargets);
      for (let i = targets.length - 1; i >= 0; i--) { guard.scan('query'); const target = targets[i]; if (target) stack.push({ ...frame, node: node.child, target }); } continue;
    }
    const target = entityIndex.resolve(frame.target, guard);
    if (node.kind === 'conditional') { const value = (traces(catalog, definitions, target, guard), attribute(target, node.attribute, guard)); stack.push({ ...frame, node: value >= node.atLeast ? node.yes : node.no }); continue; }
    const op: Operation = { opId: `${root.rootId}:op:${nextOperation()}`, rootId: root.rootId, parentId: frame.parentId, producer: root.producer, effect: frame.effect, sourceRef: root.sourceRef, sourceOwnerRef: root.sourceRef, targetRef: target.ref, depth: frame.depth, chain: frame.chain, payload: node, tags: definitions.effects.get(frame.effect, guard).tags };
    guard.operation = op; guard.charge('operations');
    const hp = target.resources.get(catalog.document.ruleset.health).current;
    let inputStages: readonly FormulaStage[] = [];
    const emitReason = (kind: string, reason: string, raw = 0, participants: readonly string[] = []): void => context.emit({ kind, operation: op, target: target.ref, before: hp, after: hp, reason, breakdown: node.kind === 'damage' ? blockedBreakdown(raw, reason, participants, inputStages, scan) : null });
    if (!guard.deduplicate(op)) { emitReason('OperationDuplicate', 'duplicateOpId'); continue; }
    if (target.vitality.life !== 'alive') { emitReason('OperationRejected', 'notAlive'); continue; }
    const input = numericInput(context, op, source, target); inputStages = input.stages; const raw = input.value;
    const candidates: HookInstance[] = [];
    for (const s of visits(target.statuses.snapshot(), scan, 'status')) for (const h of visits(definitions.modifiers.get(s.definition, guard).hooks, scan, 'hook')) if (h.match === node.kind) candidates.push({ definition: h, instanceId: s.instanceId, key: `${h.id}:${s.instanceId}` });
    const hooks = ordered(candidates, (a, b) => compareId(a.definition.stage, b.definition.stage) || b.definition.priority - a.definition.priority || compareId(a.definition.id, b.definition.id) || a.instanceId - b.instanceId, scan);
    guard.scan('diagnostic', input.participants.length); const participants: string[] = [...input.participants]; let scale = 1, replaced = false, cancelled = false;
    function eligible(h: HookInstance): boolean {
      if (frame.depth >= catalog.document.ruleset.maxHookDepth) { emitReason('HookIneligible', `depthFuel:${h.key}`, raw, participants); return false; }
      if (h.definition.action.kind === 'replace' && frame.chain.some(key => { guard.scan('hook'); return key === h.key; })) { emitReason('HookIneligible', `replacementOnce:${h.key}`, raw, participants); return false; }
      const key = `${h.key}:${target.ref.index}:${target.ref.generation}`, used = triggers.get(key) ?? 0;
      if (used >= h.definition.maxTriggersPerRootTarget) { emitReason('HookIneligible', `triggerFuel:${h.key}`, raw, participants); return false; }
      triggers.set(key, used + 1); guard.charge('hooks'); participants.push(h.key);
      context.emit({ kind: 'HookInvoked', operation: op, target: target.ref, before: hp, after: hp, reason: `${h.definition.stage}:${h.key}`, breakdown: null }); return true;
    }
    for (const h of visits(hooks, scan, 'hook')) {
      if (h.definition.stage !== 'pre') continue;
      if (!eligible(h)) continue;
      const a = h.definition.action;
      if (a.kind === 'cancel') { emitReason('OperationCancelled', a.reason, raw, participants); cancelled = true; break; }
      if (a.kind === 'scale') scale *= a.factor;
      if (a.kind === 'replace') { emitReason('OperationReplaced', h.key, raw, participants); stack.push(expansion(h, op, frame)); replaced = true; break; }
    }
    if (replaced || cancelled) continue;
    if (!dispatch(context, op, target, raw, scale, participants, inputStages)) continue;
    const derived: Frame[] = [];
    // A death-save can unregister a status in this same transaction; its Post hook must not survive removal.
    const liveIds = new Set<number>(); for (const s of visits(target.statuses.snapshot(), scan, 'status')) liveIds.add(s.instanceId);
    for (const h of visits(hooks, scan, 'hook')) if (h.definition.stage === 'post' && liveIds.has(h.instanceId) && eligible(h)) derived.push(expansion(h, op, frame));
    for (let i = derived.length - 1; i >= 0; i--) { guard.scan('hook'); const child = derived[i]; if (child) stack.push(child); }
  }
}
export function sameRef(a: EntityRef, b: EntityRef): boolean { return a.index === b.index && a.generation === b.generation; }

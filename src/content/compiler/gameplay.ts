import { durationTicks } from '../../foundation/index';
import type { ActionDef, AreaDef, ContentDocument, ContentId, EffectDef, GameplayDef, ProjectileDef, RectWorld } from '../../contracts/index';
import { object, list, id, number, count, choice, text, ContentError } from '../validation/schema';
import { requireId } from './graphs';
const error = (message: string): never => { throw new ContentError('GAMEPLAY', '$.gameplay', message); };
export function compileGameplay(raw: unknown, document: ContentDocument, rate: number): ContentDocument {
    if (!raw || typeof raw !== 'object' || !('gameplay' in raw) || raw.gameplay === undefined)
        return document;
    const g = object(raw.gameplay, '$.gameplay', ['speedAttribute', 'radiusWorld', 'arena', 'cellSizeWorld', 'obstacles', 'maxProjectiles', 'maxAreas', 'actions', 'projectiles', 'areas', 'spawns']);
    const ticks = (v: unknown, min = 0): number => count(durationTicks(number(v, 'durationMs', 0, 3600000), rate), 'ticks', min);
    const rect = (v: unknown): RectWorld => { const o = object(v, 'rect', ['minX', 'minY', 'maxX', 'maxY']); const r = { minX: number(o['minX'], 'rect', -4096, 4096), minY: number(o['minY'], 'rect', -4096, 4096), maxX: number(o['maxX'], 'rect', -4096, 4096), maxY: number(o['maxY'], 'rect', -4096, 4096) }; if (r.minX >= r.maxX || r.minY >= r.maxY)
        error('inverted rect'); return r; };
    const bool = (v: unknown): boolean => { if (typeof v !== 'boolean')
        return error('boolean required'); return v; };
    const relation = (v: unknown) => choice(v, 'relation', ['enemy', 'ally', 'any']);
    const nullable = (v: unknown): ContentId | null => v === null ? null : id(v, 'effect');
    const actions = list<ActionDef>(g['actions'], 'actions', v => {
        const a = object(v, 'action', ['id', 'basic', 'target', 'relation', 'rangeWorld', 'radiusWorld', 'windupMs', 'castMs', 'activeMs', 'recoveryMs', 'cooldownMs', 'cooldownStart', 'cancelCooldownMs', 'maxCharges', 'rechargeMs', 'cost', 'cancelBeforeRelease', 'cancelRecovery', 'interruptOnControl', 'effect', 'delivery']);
        const c = object(a['cost'], 'cost', ['resource', 'amount', 'policy', 'refundFraction']);
        const aid = id(a['id'], 'action');
        if (aid.length > 64 || aid.startsWith('m3.'))
            error('action ID must be <=64 and outside reserved m3 namespace');
        return { id: aid, basic: bool(a['basic']), target: choice(a['target'], 'target', ['self', 'unit', 'point', 'direction']), relation: relation(a['relation']), rangeWorld: number(a['rangeWorld'], 'range', 0, 4096), radiusWorld: number(a['radiusWorld'], 'radius', 0, 4096), windupTicks: ticks(a['windupMs']), castTicks: ticks(a['castMs']), activeTicks: ticks(a['activeMs']), recoveryTicks: ticks(a['recoveryMs']), cooldownTicks: ticks(a['cooldownMs']), cooldownStart: choice(a['cooldownStart'], 'cooldownStart', ['start', 'release', 'end']), cancelCooldownTicks: ticks(a['cancelCooldownMs']), maxCharges: count(a['maxCharges'], 'charges', 1, 16), rechargeTicks: ticks(a['rechargeMs'], 1), cost: { resource: id(c['resource'], 'cost'), amount: number(c['amount'], 'amount', 0, 1e9), policy: choice(c['policy'], 'policy', ['start', 'release']), refundFraction: number(c['refundFraction'], 'refund', 0, 1) }, cancelBeforeRelease: bool(a['cancelBeforeRelease']), cancelRecovery: bool(a['cancelRecovery']), interruptOnControl: bool(a['interruptOnControl']), effect: id(a['effect'], 'effect'), delivery: choice(a['delivery'], 'delivery', ['instant', 'projectile', 'area', 'displacement']) };
    });
    const projectiles = list<ProjectileDef>(g['projectiles'], 'projectiles', v => { const p = object(v, 'projectile', ['id', 'speedWorldPerSecond', 'radiusWorld', 'lifetimeMs', 'hits', 'relation', 'effect', 'sourcePolicy']); return { id: id(p['id'], 'projectile'), speedWorldPerSecond: number(p['speedWorldPerSecond'], 'speed', 1, 30000), radiusWorld: number(p['radiusWorld'], 'radius', 0, 64), lifetimeTicks: ticks(p['lifetimeMs'], 1), hits: choice(p['hits'], 'hits', ['single', 'multi']), relation: relation(p['relation']), effect: id(p['effect'], 'effect'), sourcePolicy: choice(p['sourcePolicy'], 'source', ['impactAttributesContinueAfterDeath']) }; });
    const areas = list<AreaDef>(g['areas'], 'areas', v => { const a = object(v, 'area', ['id', 'radiusWorld', 'durationMs', 'intervalMs', 'firstPulse', 'relation', 'enter', 'pulse', 'exit', 'expiry']); return { id: id(a['id'], 'area'), radiusWorld: number(a['radiusWorld'], 'radius', 0, 4096), durationTicks: ticks(a['durationMs'], 1), intervalTicks: ticks(a['intervalMs'], 1), firstPulse: choice(a['firstPulse'], 'first', ['activation', 'interval']), relation: relation(a['relation']), enter: nullable(a['enter']), pulse: nullable(a['pulse']), exit: nullable(a['exit']), expiry: nullable(a['expiry']) }; });
    const spawns = list(g['spawns'], 'spawns', v => { const a = object(v, 'spawn', ['xWorld', 'yWorld', 'team', 'controller']); return { position: { xWorld: number(a['xWorld'], 'xWorld', -4096, 4096), yWorld: number(a['yWorld'], 'yWorld', -4096, 4096) }, team: count(a['team'], 'team', 0, 9), controller: a['controller'] === null ? null : text(a['controller'], 'controller') }; });
    const gameplay: GameplayDef = { speedAttribute: id(g['speedAttribute'], 'speedAttribute'), radiusWorld: number(g['radiusWorld'], 'radiusWorld', 1, 64), arena: rect(g['arena']), cellSizeWorld: number(g['cellSizeWorld'], 'cellSizeWorld', 32, 4096), obstacles: list(g['obstacles'], 'obstacles', v => rect(v)), maxProjectiles: count(g['maxProjectiles'], 'maxProjectiles', 1, 128), maxAreas: count(g['maxAreas'], 'maxAreas', 1, 64), actions, projectiles, areas, spawns };
    if (actions.length < 1 || actions.length > 16 || projectiles.length > 16 || areas.length > 16 || gameplay.obstacles.length > 16 || !spawns.length || spawns.length > document.ruleset.maxUnits)
        error('gameplay envelope');
    if (Math.ceil((gameplay.arena.maxX - gameplay.arena.minX) / gameplay.cellSizeWorld) * Math.ceil((gameplay.arena.maxY - gameplay.arena.minY) / gameplay.cellSizeWorld) > 256)
        error('grid exceeds 256 cells');
    for (const values of [actions, projectiles, areas])
        if (new Set(values.map(x => x.id)).size !== values.length)
            error('duplicate gameplay ID');
    const speed = requireId(document.attributes, gameplay.speedAttribute, 'speed');
    if (speed.min < 0 || speed.max > 30000)
        error('speed attribute envelope');
    for (const s of spawns)
        if (s.position.xWorld < gameplay.arena.minX + gameplay.radiusWorld || s.position.xWorld > gameplay.arena.maxX - gameplay.radiusWorld || s.position.yWorld < gameplay.arena.minY + gameplay.radiusWorld || s.position.yWorld > gameplay.arena.maxY - gameplay.radiusWorld)
            error('spawn outside arena');
    if (document.ruleset.producers.some(p => p.effects.some(e => e.startsWith('m3.'))) || document.modifiers.some(m => m.hooks.some(h => 'effect' in h.action && h.action.effect.startsWith('m3.'))))
        error('intrinsic costs cannot be authored producer or Hook roots');
    if (document.effects.some(e => e.id.startsWith('m3.')))
        error('compiler-owned Effect namespace');
    if (document.ruleset.producers.some(p => p.id.startsWith('m3.') || ['action', 'projectile', 'area','movement'].includes(p.kind)))
        error('gameplay producers are compiler-owned');
    for (const s of spawns)
        for (const o of gameplay.obstacles) {
            const x = Math.max(o.minX, Math.min(o.maxX, s.position.xWorld)), y = Math.max(o.minY, Math.min(o.maxY, s.position.yWorld));
            if (Math.hypot(x - s.position.xWorld, y - s.position.yWorld) < gameplay.radiusWorld)
                error('spawn intersects obstacle');
        }
    const effects: EffectDef[] = [...document.effects,{id:'m3.move.intent' as ContentId,tags:[],node:{kind:'movementIntent'}},{id:'m3.move.step' as ContentId,tags:[],node:{kind:'movementStep'}}];
    for (const a of actions) {
        requireId(document.effects, a.effect, a.id);
        requireId(document.resources, a.cost.resource, a.id);
        if (a.cost.resource === document.ruleset.health)
            error('action cost cannot spend Health');
        const n = requireId(document.effects, a.effect, a.id).node;
        if ((a.delivery === 'projectile' && n.kind !== 'spawnProjectile') || (a.delivery === 'area' && n.kind !== 'spawnArea') || (a.delivery === 'displacement' && n.kind !== 'displace') || (a.delivery === 'instant' && ['spawnProjectile', 'spawnArea', 'displace'].includes(n.kind)))
            error('delivery does not match Effect');
        for (const mode of ['reserve', 'spend', 'commit', 'release', 'refund'] as const)
            effects.push({ id: `m3.cost.${a.id}.${mode}` as ContentId, tags: [], node: { kind: 'actionCost', resource: a.cost.resource, amount: mode === 'refund' ? a.cost.amount * a.cost.refundFraction : a.cost.amount, mode } });
    }
    const spawnerIds = new Set(actions.filter(a => a.delivery === 'projectile' || a.delivery === 'area').map(a => a.effect));
    for (const p of projectiles) {
        requireId(document.effects, p.effect, p.id);
        if (spawnerIds.has(p.effect))
            error('projectile cannot be asynchronous spawner');
        const node = requireId(document.effects, p.effect, p.id).node;
        if (p.hits === 'multi' && (node.kind !== 'targets' || node.selector !== 'primary'))
            error('multi hit Effect requires explicit primary fanout');
    }
    for (const a of areas)
        for (const effect of [a.enter, a.pulse, a.exit, a.expiry])
            if (effect) {
                requireId(document.effects, effect, a.id);
                if (spawnerIds.has(effect))
                    error('area cannot be asynchronous spawner');
                const node = requireId(document.effects, effect, a.id).node;
                if (effect !== a.expiry && (node.kind !== 'targets' || node.selector !== 'primary'))
                    error('Area batch Effect requires explicit primary fanout');
            }
    // Asynchronous recursive spawners are deliberately rejected: no unproved cross-Tick creation chain.
    const walk = (n: typeof document.effects[number]['node'], allowSpawn: boolean): void => {
        if (n.kind === 'spawnProjectile') {
            requireId(projectiles, n.definition, 'projectile');
            if (!allowSpawn)
                error('spawn only allowed in action release');
        }
        if (n.kind === 'spawnArea') {
            requireId(areas, n.definition, 'area');
            if (!allowSpawn)
                error('spawn only allowed in action release');
        }
        if ('child' in n)
            walk(n.child, false);
        if ('children' in n)
            n.children.forEach(c => walk(c, false));
        if (n.kind === 'conditional') {
            walk(n.yes, false);
            walk(n.no, false);
        }
    };
    for (const e of document.effects)
        walk(e.node, actions.some(a => a.effect === e.id && a.delivery !== 'instant'));
    for (const m of document.modifiers)
        for (const h of m.hooks)
            if ('effect' in h.action && ['spawnProjectile', 'spawnArea'].includes(requireId(document.effects, h.action.effect, h.id).node.kind))
                error('unproved Hook spawner');
    const actionEffects = [...new Set([...actions.map(a => a.effect), ...effects.filter(e => e.node.kind === 'actionCost').map(e => e.id)])];
    const projectileEffects = [...new Set(projectiles.map(p => p.effect))];
    const areaEffects = [...new Set(areas.flatMap(a => [a.enter, a.pulse, a.exit, a.expiry].filter((e): e is ContentId => e !== null)))];
    const producers = [...document.ruleset.producers, { id: 'm3.action' as ContentId, kind: 'action' as const, maxInstances: document.ruleset.maxUnits, rootsPerInstancePerTick: 8, effects: actionEffects }];
    producers.push({id:'m3.movement' as ContentId,kind:'movement' as const,maxInstances:document.ruleset.maxUnits,rootsPerInstancePerTick:3,effects:['m3.move.intent' as ContentId,'m3.move.step' as ContentId]});
    if (projectileEffects.length)
        producers.push({ id: 'm3.projectile' as ContentId, kind: 'projectile' as const, maxInstances: gameplay.maxProjectiles, rootsPerInstancePerTick: 1, effects: projectileEffects });
    if (areaEffects.length)
        producers.push({ id: 'm3.area' as ContentId, kind: 'area' as const, maxInstances: gameplay.maxAreas, rootsPerInstancePerTick: 8, effects: areaEffects });
    return { ...document, effects, ruleset: { ...document.ruleset, producers }, gameplay };
}

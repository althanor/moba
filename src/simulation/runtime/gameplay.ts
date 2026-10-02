import { distance, unit, subtract } from '../../foundation/index';
import type { ActionDef, ActionInstance, BattleView, CombatConfig, CombatFact, ContentId, EntityRef, EffectNode, GameplayCommand, Operation, RejectReason } from '../../contracts/index';
import { ActionStore } from '../features/actions/store';
import type { ActionAccess } from '../features/actions/store';
import { MovementStore } from '../features/movement/store';
import { ProjectileStore } from '../features/projectiles/store';
import { AreaStore } from '../features/areas/store';
import { SpatialGrid, matches } from '../shared/queries/grid';
import type { SpatialUnit } from '../shared/queries/grid';
import { visits } from '../shared/work';
import type { Scan } from '../shared/work';
import { controlCapabilities } from '../features/status/store';
import { attribute, statusDefs } from './combat-state';
import type { RuntimeEntity } from './combat-state';
import type { RuntimeDefinitions } from '../kernel/definition-index';
import type { CapacityGuard } from '../kernel/capacity-guard';
import type { RootIntent } from './effect-executor';
interface GameplayFrame {
    readonly guard: CapacityGuard;
    readonly emit: (fact: Omit<CombatFact, 'eventId' | 'tick' | 'phase'>) => void;
    readonly run: (root: RootIntent, inherited: boolean) => boolean;
    readonly roots: RootIntent[];
}
export class GameplayRuntime {
    readonly actions: ActionStore;
    readonly movement: MovementStore;
    readonly projectiles: ProjectileStore;
    readonly areas: AreaStore;
    readonly grid: SpatialGrid;
    readonly #spatial: SpatialUnit[];
    #frame: GameplayFrame | null = null;
    #serial = 0;
    #clear = false;
    #deferred: RootIntent[] = [];
    #instant: {
        actor: EntityRef;
        def: ActionDef;
        instance: ActionInstance;
    }[] = [];
    constructor(readonly config: CombatConfig, readonly entities: readonly RuntimeEntity[], readonly definitions: RuntimeDefinitions, readonly scan: Scan, readonly lookup: () => void, readonly currentGuard: () => CapacityGuard | null) {
        const g = config.catalog.document.gameplay;
        if (!g || g.spawns.length !== entities.length)
            throw new Error('gameplay roster');
        const refs = entities.map(e => { scan('action', 1); return e.ref; });
        this.actions = new ActionStore(g.actions, refs, scan, lookup);
        this.movement = new MovementStore(g, refs, scan, lookup);
        this.projectiles = new ProjectileStore(g, scan, lookup);
        this.areas = new AreaStore(g, scan, lookup);
        this.#spatial = refs.map((ref, i) => { scan('spatial', 1); const s = g.spawns[i], m = this.movement.get(ref); if (!s)
            throw new Error('spawn'); return { ref, team: s.team, position: m.position, previous: m.previous, alive: true, targetable: true }; });
        this.grid = new SpatialGrid(g, scan, () => this.#frame?.guard.charge('queries'),lookup);
        this.grid.rebuild(this.#spatial);
    }
    get g() { const g = this.config.catalog.document.gameplay; if (!g)
        throw new Error('gameplay'); return g; }
    attach(frame: GameplayFrame): void { this.#frame = frame; }
    detach(): void { this.#frame = null; }
    #active(): GameplayFrame { if (!this.#frame)
        throw new Error('gameplay outside Tick'); return this.#frame; }
    #entity(ref: EntityRef): RuntimeEntity { const e = this.entities[ref.index]; this.lookup(); if (!e || e.ref.generation !== ref.generation)
        throw new Error('gameplay handle'); return e; }
    capabilities(ref: EntityRef) { const e = this.#entity(ref); return { ...controlCapabilities(statusDefs(this.definitions, e, this.currentGuard()).map(s => { this.scan('status', 1); return s.definition; }), this.scan), alive: e.vitality.life === 'alive', speed: attribute(e, this.g.speedAttribute, this.currentGuard()) }; }
    validate(actor: EntityRef, d: ActionDef, target: EntityRef | null, point: ActionInstance['aim'], started = false): RejectReason | null {
        const e = this.#entity(actor), c = this.capabilities(actor);
        if (!c.alive)
            return 'invalidActor';
        if ((!started || d.interruptOnControl) && (d.basic ? !c.canBasicAttack : !c.canCast))
            return 'controlled';
        const m = this.movement.get(actor);
        if (d.target === 'unit') {
            if (!target || !this.entities[target.index] || this.entities[target.index]?.ref.generation !== target.generation)
                return 'target';
            const other = this.#entity(target);
            if (other.vitality.life !== 'alive' || !this.capabilities(target).targetable || !matches(this.#spatial[actor.index]?.team ?? 0, this.#spatial[target.index]?.team ?? 0, d.relation))
                return 'target';
            if (distance(m.position, this.movement.get(target).position) > d.rangeWorld + this.g.radiusWorld)
                return 'range';
        }
        else if (d.target === 'point' && distance(m.position, point) > d.rangeWorld)
            return 'range';
        else if (d.target === 'direction' && distance(m.position, point) < 1e-9)
            return 'target';
        return e.vitality.life === 'alive' ? null : 'invalidActor';
    }
    #event(ref: EntityRef, kind: string, reason: string | null = null): void { const f = this.#active(); f.guard.charge('operations'); f.emit({ kind, operation: null, target: ref, before: 0, after: 0, reason, breakdown: null }); }
    #root(effect: ContentId, producer: ContentId, actor: EntityRef, targets: readonly EntityRef[], point: ActionInstance['aim'], reservation: string | null = null): RootIntent {
        const f = this.#active();
        this.scan('scheduler', targets.length);
        return { rootId: `${this.config.matchId}:${f.guard.tickIndex}:m3:${++this.#serial}`, effect, producer, sourceRef: actor, targets: [...targets], sourceSequence: this.#serial, aim: { point: { ...point }, target: targets[0] ?? null, reservation } };
    }
    #cost(ref: EntityRef, d: ActionDef, mode: 'reserve' | 'spend' | 'commit' | 'release' | 'refund', key: string): boolean {
        const f = this.#active(), root = this.#root(`m3.cost.${d.id}.${mode}` as ContentId, 'm3.action' as ContentId, ref, [ref], this.movement.get(ref).position, key), parent = f.guard.operation;
        return f.run(parent ? { ...root, rootId: parent.rootId, producer: parent.producer, parent } : root, !!parent);
    }
    #access(): ActionAccess { const f = this.#active(); return { tick: f.guard.tickIndex, validate: this.validate.bind(this), cost: this.#cost.bind(this), release: this.#release.bind(this), event: this.#event.bind(this), reservationValid: (ref, d) => { const r = this.#entity(ref).resources; return r.reserved(d.cost.resource,this.lookup) <= r.get(d.cost.resource).current; } }; }
    command(c: GameplayCommand): RejectReason | null {
        const s = this.g.spawns[c.actorRef.index], e = this.entities[c.actorRef.index];
        if (!s || !e || e.ref.generation !== c.actorRef.generation || s.controller !== c.controllerId)
            return 'wrongController';
        if (c.kind === 'move') {
            const cap = this.capabilities(c.actorRef);
            if (!cap.alive)
                return 'invalidActor';
            if (!cap.canMove)
                return 'controlled';
            this.#movementIntent(c.actorRef,c.payload.direction);
            return null;
        }
        if (c.kind === 'targetLock' && c.payload.target) {
            const t = c.payload.target, entity = this.entities[t.index];
            if (!entity || entity.ref.generation !== t.generation || entity.vitality.life !== 'alive' || !this.capabilities(t).targetable)
                return 'target';
        }
        return this.actions.command(c, this.#access());
    }
    time(): void { const f = this.#active(); this.projectiles.expire(f.guard.tickIndex, (p, reason) => this.#event(p.source, 'ProjectileEnded', reason)); this.areas.expire(f.guard.tickIndex, (a, effect, targets) => f.roots.push(this.#root(effect, 'm3.area' as ContentId, a.source, targets, a.position)), (a, reason) => this.#event(a.source, 'AreaEnded', reason)); if (this.#clear) {
        for(const e of visits(this.entities,this.scan,'movement'))this.#movementIntent(e.ref,{xWorld:0,yWorld:0});
        this.#clear = false;
    } this.movement.begin(); this.actions.mature(f.guard.tickIndex); for (const e of visits(this.entities, this.scan, 'spatial'))
        this.#sync(e.ref); this.grid.rebuild(this.#spatial); }
    #sync(ref: EntityRef): void { const u = this.#spatial[ref.index], m = this.movement.get(ref), c = this.capabilities(ref); if (u)
        Object.assign(u, { position: m.position, previous: m.previous, alive: c.alive, targetable: c.targetable }); }
    actionsPhase(): void { const f = this.#active(); for (const r of visits(this.#deferred, this.scan, 'scheduler'))
        f.roots.push(r); this.#deferred = []; this.actions.advance(this.#access()); }
    #release(ref: EntityRef, d: ActionDef, i: ActionInstance): void {
        const f = this.#active(), point = d.target === 'self' ? this.movement.get(ref).position : i.aim;
        if (d.delivery === 'instant')
            this.#instant.push({ actor: ref, def: d, instance: i });
        else
            f.run(this.#root(d.effect, 'm3.action' as ContentId, ref, d.target === 'unit' && i.targetRef ? [i.targetRef] : [ref], point), false);
    }
    #movementIntent(ref:EntityRef,direction:ActionInstance['aim']):void {const f=this.#active(),root=this.#root('m3.move.intent' as ContentId,'m3.movement' as ContentId,ref,[ref],this.movement.get(ref).position);f.run({...root,aim:{point:this.movement.get(ref).position,target:ref,reservation:null,intentDirection:{...direction}}},false);}
    movementPhase():void {const f=this.#active();this.movement.advance(this.capabilities.bind(this),ref=>f.run(this.#root('m3.move.step' as ContentId,'m3.movement' as ContentId,ref,[ref],this.movement.get(ref).position),false));}
    spatialPhase(): void {
        const f = this.#active(), n = f.guard.tickIndex;
        this.grid.rebuild(this.#spatial);
        for (const x of visits(this.#instant, this.scan, 'action')) {
            const d = x.def, i = x.instance, reason = this.validate(x.actor, d, i.targetRef, i.aim, true);
            if (reason) {
                this.#event(x.actor, 'ActionImpactRejected', reason);
                continue;
            }
            const targets = d.target === 'self' ? [x.actor] : d.target === 'unit' && i.targetRef ? [i.targetRef] : this.grid.query({ kind: 'radius', center: i.aim, radiusWorld: d.radiusWorld }, this.#spatial[x.actor.index]?.team ?? 0, d.relation).map(h => { this.scan('query', 1); return h.ref; });
            f.roots.push(this.#root(d.effect, 'm3.action' as ContentId, x.actor, targets, i.aim));
        }
        this.#instant = [];
        this.projectiles.advance(n, this.config.tickRate, this.grid, (p, effect, targets) => f.roots.push(this.#root(effect, 'm3.projectile' as ContentId, p.source, targets, p.position)), (p, reason) => this.#event(p.source, 'ProjectileEnded', reason));
        this.areas.update(n, this.grid, (a, effect, targets, kind) => { void kind; f.roots.push(this.#root(effect, 'm3.area' as ContentId, a.source, targets, a.position)); }, (a, reason) => this.#event(a.source, 'AreaEnded', reason));
    }
    afterOperation(op: Operation): void {
        if (op.payload.kind === 'actionCost')
            return;
        this.#sync(op.targetRef);
        const u = this.#spatial[op.targetRef.index];
        if (u)
            this.grid.update(u);
        // Reconciliation is targeted; no per-Operation full roster scan.
        this.actions.reconcileOne(op.targetRef, this.#access());
        const c = this.capabilities(op.targetRef);
        if (!c.alive || !c.canDisplace || !c.canMove)
            this.movement.interrupt(op.targetRef, !c.alive || !c.canDisplace);
    }
    dispatch(op: Operation): string | null {
        const p = op.payload, ref = op.targetRef, f = this.#active(), m = this.movement.get(ref), e = this.#entity(ref);
        if(p.kind==='movementStep'){this.movement.step(ref,this.config.tickRate,this.grid,this.capabilities(ref));return null;}
        if(p.kind==='movementIntent'){if(!op.aim?.intentDirection)return 'intentRequired';this.movement.intent(ref,op.aim.intentDirection);return null;}
        if (p.kind === 'actionCost') {
            const key = op.aim?.reservation;
            if (!key)
                return 'reservationKey';
            return e.resources.action(p.resource, p.amount, p.mode, key,this.lookup);
        }
        if (!op.aim)
            return 'aimRequired';
        if (p.kind === 'displace') {
            const c = this.capabilities(ref);
            if (!c.canDisplace || p.mode === 'dash' && !c.canMove)
                return 'controlled';
            this.movement.displace(ref, op.aim.point, p, this.grid);
            return null;
        }
        const start = f.guard.phase === 'P2' ? f.guard.tickIndex : f.guard.tickIndex + 1;
        if (p.kind === 'spawnProjectile')
            return this.projectiles.spawn(p.definition, op.sourceRef, this.#spatial[op.sourceRef.index]?.team ?? 0, m.position, op.aim.point, start);
        if (p.kind === 'spawnArea')
            return this.areas.spawn(p.definition, op.sourceRef, this.#spatial[op.sourceRef.index]?.team ?? 0, op.aim.point, start);
        return 'unknownGameplayOperation';
    }
    targets(node: Extract<EffectNode, {
        kind: 'spatialTargets';
    }>, source: EntityRef, aim: Operation['aim']): readonly EntityRef[] {
        const from = this.movement.get(source).position, point = aim?.point ?? from, center = node.center === 'source' ? from : point, dir = unit(subtract(point, from));
        const shape = node.shape === 'radius' ? { kind: 'radius' as const, center, radiusWorld: node.radiusWorld } : node.shape === 'cone' ? { kind: 'cone' as const, center, direction: dir, radiusWorld: node.radiusWorld, cosine: node.cosine } : { kind: 'sweep' as const, from: center, to: { xWorld: center.xWorld + dir.xWorld * node.lengthWorld, yWorld: center.yWorld + dir.yWorld * node.lengthWorld }, radiusWorld: node.radiusWorld, movingTargets: false };
        return this.grid.query(shape, this.#spatial[source.index]?.team ?? 0, node.relation).map(h => { this.scan('query', 1); return h.ref; });
    }
    finish(): void { this.#active(); for (const e of visits(this.entities, this.scan, 'action'))
        if (e.vitality.life !== 'alive') {
            this.actions.reconcileOne(e.ref, this.#access());
            this.movement.stop(e.ref);
        } this.areas.deathExit(ref => this.#entity(ref).vitality.life === 'alive', (a, effect, targets) => { const root = this.#root(effect, 'm3.area' as ContentId, a.source, targets, a.position); this.#deferred.push(root); }); }
    neutralize(): void { this.#clear = true; }
    state() { return { reservations: this.entities.map(e => { this.scan('resource', 1); return e.resources.reservations(); }), actions: this.actions.snapshot(), movement: this.movement.snapshot(), projectiles: this.projectiles.snapshot(), areas: this.areas.snapshot(), deferred: this.#deferred.map(r => { this.scan('scheduler', 1); return r; }), serial: this.#serial, clear: this.#clear }; }
    view(): BattleView {
        const state = this.state(), f = this.#frame;
        const units = this.entities.map(e => { this.scan('spatial', 1); const m = this.movement.get(e.ref), c = this.capabilities(e.ref), hp = e.resources.get(this.config.catalog.document.ruleset.health), res = e.resources.get(this.g.actions[0]?.cost.resource ?? this.config.catalog.document.ruleset.health), a = state.actions[e.ref.index]; return { ref: e.ref, team: this.#spatial[e.ref.index]?.team ?? 0, previous: m.previous, position: m.position, facing: m.facing, discontinuity: m.discontinuity, alive: c.alive, canMove: c.canMove, speedWorldPerSecond: c.speed, shield: e.vitality.shields().reduce((sum, s) => { this.scan('shield', 1); return sum + s.remaining; }, 0), health: hp.current, maximumHealth: hp.maximum, resource: res.current, maximumResource: res.maximum, reserved: e.resources.reserved(res.id,this.lookup), statuses: e.statuses.snapshot().map(s => { this.scan('status', 1); return String(s.definition); }), phase: this.actions.active(e.ref)?.phase ?? 'ready', lock: this.actions.lock(e.ref), cooldowns: a?.ready.map(r => { this.scan('action', 1); return { id: String(r.definition), readyTick: r.readyTick, charges: r.charges }; }) ?? [] }; });
        const value: BattleView = { disclosure: 'public-debug-arena-v1', player: this.entities[0]?.ref ?? { index: 0, generation: 1 }, units, projectiles: state.projectiles.map(p => { this.scan('projectile', 1); return { id: p.id, position: p.position, previous: p.previous, radiusWorld: this.projectiles.definition(p.definition).radiusWorld }; }), areas: state.areas.map(a => { this.scan('area', 1); return { id: a.id, position: a.position, radiusWorld: this.areas.definition(a.definition).radiusWorld, endTick: a.endTick }; }), obstacles: this.g.obstacles, arena: this.g.arena, actions: this.g.actions };
        return f ? f.guard.freeze(value) : value;
    }
}

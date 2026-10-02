import type { Vec2 } from '../../../foundation/index';
import type { ActionDef, ActionInstance, ContentId, EntityRef, GameplayCommand, RejectReason } from '../../../contracts/index';
import { DefinitionIndex } from '../../kernel/definition-index';
import { visits } from '../../shared/work';
import type { Scan } from '../../shared/work';
export interface ActionAccess {
    readonly tick: number;
    validate(actor: EntityRef, definition: ActionDef, target: EntityRef | null, point: Vec2, started?: boolean): RejectReason | null;
    cost(actor: EntityRef, definition: ActionDef, mode: 'reserve' | 'spend' | 'commit' | 'release' | 'refund', key: string): boolean;
    release(actor: EntityRef, definition: ActionDef, instance: ActionInstance): void;
    event(actor: EntityRef, kind: string, reason: string | null): void;
    reservationValid(actor: EntityRef, definition: ActionDef): boolean;
}
interface Ready {
    definition: ContentId;
    readyTick: number;
    charges: number;
    nextChargeTick: number;
}
interface ActorActions {
    ref: EntityRef;
    active: ActionInstance | null;
    ready: Ready[];
    lock: EntityRef | null;
    lastAttemptTick: number;
}
export class ActionStore {
    readonly #actors: ActorActions[];
    readonly #definitions: DefinitionIndex<ActionDef>;
    constructor(readonly defs: readonly ActionDef[], refs: readonly EntityRef[], readonly scan: Scan, readonly lookup: () => void = () => { }) {
        this.#definitions = new DefinitionIndex(defs, () => scan('action', 1));
        this.#actors = refs.map(ref => { scan('action', 1); return { ref, active: null, ready: defs.map(d => { scan('action', 1); return { definition: d.id, readyTick: 0, charges: d.maxCharges, nextChargeTick: 0 }; }), lock: null, lastAttemptTick: -1 }; });
    }
    definition(id: ContentId): ActionDef { return (this.lookup(), this.#definitions.get(id)); }
    #actor(ref: EntityRef): ActorActions { this.lookup(); const a = this.#actors[ref.index]; if (!a || a.ref.generation !== ref.generation)
        throw new Error('action handle'); return a; }
    #ready(a: ActorActions, id: ContentId): Ready { for (const r of visits(a.ready, this.scan, 'action'))
        if (r.definition === id)
            return r; throw new Error('unowned ability'); }
    command(c: GameplayCommand, access: ActionAccess): RejectReason | null {
        const a = this.#actor(c.actorRef);
        if (c.kind === 'targetLock') {
            a.lock = c.payload.target;
            return null;
        }
        if (c.kind === 'cancelAction')
            return this.cancel(c.actorRef, access, 'cancelled', false);
        if (c.kind !== 'cast' || !c.payload.action)
            return 'content';
        this.lookup();
        if (!this.#definitions.has(c.payload.action))
            return 'content';
        const d = this.definition(c.payload.action), target = c.payload.target ?? (d.target === 'unit' ? a.lock : null), reason = access.validate(c.actorRef, d, target, c.payload.point);
        if (reason)
            return reason;
        if (a.active || a.lastAttemptTick === access.tick)
            return 'busy';
        const r = this.#ready(a, d.id);
        if (r.readyTick > access.tick)
            return 'cooldown';
        if (r.charges < 1)
            return 'charges';
        const key = `action:${c.actorRef.index}:${access.tick}:${c.sequence}`;
        a.lastAttemptTick = access.tick;
        if (!access.cost(c.actorRef, d, d.cost.policy === 'release' ? 'reserve' : 'spend', key))
            return 'resource';
        const releaseTick = access.tick + d.windupTicks + d.castTicks, activeEndTick = releaseTick + d.activeTicks;
        a.active = { id: key, definition: d.id, targetRef: target, aim: { ...c.payload.point }, startedTick: access.tick, releaseTick, activeEndTick, endTick: activeEndTick + d.recoveryTicks, phase: d.windupTicks ? 'windup' : d.castTicks ? 'cast' : 'active', released: false };
        a.lastAttemptTick = access.tick;
        if (d.cooldownStart === 'start')
            r.readyTick = access.tick + d.cooldownTicks;
        access.event(c.actorRef, 'ActionStarted', null);
        return null;
    }
    cancel(ref: EntityRef, access: ActionAccess, reason: string, forced: boolean): RejectReason | null {
        const a = this.#actor(ref), i = a.active;
        if (!i)
            return null;
        const d = this.definition(i.definition);
        if (!forced && (!i.released && !d.cancelBeforeRelease || i.released && !d.cancelRecovery))
            return 'cancelForbidden';
        // Clear first: after-commit reconciliation is synchronous and cannot cancel twice.
        a.active = null;
        if (!i.released)
            access.cost(ref, d, d.cost.policy === 'release' ? 'release' : 'refund', i.id);
        const r = this.#ready(a, d.id);
        r.readyTick = Math.max(r.readyTick, access.tick + d.cancelCooldownTicks);
        access.event(ref, 'ActionInterrupted', reason);
        return null;
    }
    mature(tick: number): void { for (const a of visits(this.#actors, this.scan, 'action'))
        for (const r of visits(a.ready, this.scan, 'action')) {
            const d = this.definition(r.definition);
            if (r.charges < d.maxCharges && tick >= r.nextChargeTick) {
                r.charges++;
                r.nextChargeTick = r.charges < d.maxCharges ? tick + d.rechargeTicks : 0;
            }
        } }
    advance(access: ActionAccess): void {
        for (const a of visits(this.#actors, this.scan, 'action')) {
            let i = a.active;
            if (!i)
                continue;
            const d = this.definition(i.definition);
            if (!i.released) {
                const reason = access.validate(a.ref, d, i.targetRef, i.aim, true);
                if (reason || !access.reservationValid(a.ref, d)) {
                    this.cancel(a.ref, access, reason ?? 'reservationInvalid', true);
                    continue;
                }
                if (access.tick >= i.releaseTick) {
                    // reservation key and amount were established by the cost owner; release commits exactly once.
                    if (d.cost.policy === 'release' && !access.cost(a.ref, d, 'commit', i.id)) {
                        this.cancel(a.ref, access, 'resource', true);
                        continue;
                    }
                    const r = this.#ready(a, d.id);
                    r.charges--;
                    if (!r.nextChargeTick)
                        r.nextChargeTick = access.tick + d.rechargeTicks;
                    if (d.cooldownStart === 'release')
                        r.readyTick = access.tick + d.cooldownTicks;
                    i = { ...i, released: true, phase: d.activeTicks ? 'active' : 'recovery' };
                    a.active = i;
                    access.event(a.ref, 'ActionReleased', null);
                    access.release(a.ref, d, i);
                }
                else {
                    a.active = { ...i, phase: access.tick < i.startedTick + d.windupTicks ? 'windup' : 'cast' };
                    continue;
                }
            }
            if (access.tick >= i.endTick) {
                a.active = null;
                if (d.cooldownStart === 'end')
                    this.#ready(a, d.id).readyTick = access.tick + d.cooldownTicks;
                access.event(a.ref, 'ActionEnded', null);
            }
            else if (access.tick >= i.activeEndTick)
                a.active = { ...i, phase: 'recovery' };
        }
    }
    reconcileOne(ref: EntityRef, access: ActionAccess): void { const a = this.#actor(ref); if (a.active) {
        const d = this.definition(a.active.definition), reason = access.validate(a.ref, d, a.active.targetRef, a.active.aim, true);
        if (reason === 'invalidActor' || reason === 'controlled' && d.interruptOnControl || !a.active.released && !access.reservationValid(a.ref, d))
            this.cancel(a.ref, access, reason ?? 'reservationInvalid', true);
    } }
    active(ref: EntityRef): ActionInstance | null { return this.#actor(ref).active; }
    lock(ref: EntityRef): EntityRef | null { return this.#actor(ref).lock; }
    snapshot() { return this.#actors.map(a => { this.scan('action', 1); return { ...a, active: a.active ? { ...a.active } : null, ready: a.ready.map(r => { this.scan('action', 1); return { ...r }; }) }; }); }
}

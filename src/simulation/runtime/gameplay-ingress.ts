import { canonical } from '../../foundation/index';
import type { CommandResult, GameplayCommand, RejectReason } from '../../contracts/index';
import { ordered, visits } from '../shared/work';
import type { Scan } from '../shared/work';
import type { CapacityGuard } from '../kernel/capacity-guard';
export class GameplayIngress {
    #queue: GameplayCommand[] = [];
    #cancelled: GameplayCommand[] = [];
    #history = new Map<string, {
        fingerprint: string;
        result: CommandResult;
    }>();
    #expired = new Map<string, number>();
    constructor(readonly scan: Scan,readonly lookup:()=>void) { }
    get pending(): number { return this.#queue.length + this.#cancelled.length; }
    #key(c: GameplayCommand): string { return `${c.controllerId}:${c.sequence}`; }
    enqueue(c: GameplayCommand, tick: number, guard: CapacityGuard, result: (sequence: number, outcome: CommandResult['outcome'], reason: RejectReason | null) => CommandResult, otherPending: number): CommandResult {
        let work = 0;
        const fingerprint = canonical(c, n => work += n);
        guard.charge('structure', work);
        this.lookup();const key = this.#key(c), old = this.#history.get(key);
        if (old)
            return old.fingerprint === fingerprint ? old.result : result(c.sequence, 'rejected', 'sequenceConflict');
        let reason: RejectReason | null = null;
        if (c.sequence <= (this.lookup(),this.#expired.get(c.controllerId) ?? 0))
            reason = 'sequenceExpired';
        else if (c.targetTick <= tick)
            reason = 'staleTick';
        else if (c.targetTick > tick + 90)
            reason = 'futureTick';
        else if (this.pending + otherPending >= 512)
            reason = 'queueFull';
        else if (this.#queue.filter(q => { this.scan('scheduler', 1); return q.targetTick === c.targetTick && q.controllerId === c.controllerId; }).length >= 32)
            reason = 'seatLimit';
        const r = result(c.sequence, reason ? 'rejected' : 'queued', reason);
        if (!reason)
            this.#queue.push(guard.freeze(c));
        this.#history.set(key, { fingerprint, result: r });
        if (this.#history.size > 512)
            for (const [k, v] of this.#history) {
                this.scan('scheduler', 1);
                if (!this.#queue.some(q => { this.scan('scheduler', 1); return this.#key(q) === k; }) && !this.#cancelled.some(q => { this.scan('scheduler', 1); return this.#key(q) === k; })) {
                    this.#history.delete(k);
                    const split = k.lastIndexOf(':'), controller = k.slice(0, split);
                    this.lookup();this.#expired.set(controller, Math.max(this.#expired.get(controller) ?? 0, v.result.sequence));
                    break;
                }
            }
        if (this.#expired.size > 454)
            guard.fault('CONTROLLER_ENVELOPE', 'unknown controller growth');
        return r;
    }
    consume(tick: number, rotation: number, maxUnits: number, onCancelled: (c: GameplayCommand) => void): GameplayCommand[] { for (const c of visits(this.#cancelled, this.scan, 'scheduler'))
        onCancelled(c); this.#cancelled = []; const current = this.#queue.filter(c => { this.scan('scheduler', 1); return c.targetTick === tick; }); this.#queue = this.#queue.filter(c => { this.scan('scheduler', 1); return c.targetTick !== tick; }); return ordered(current, (a, b) => (a.actorRef.index + rotation + tick) % maxUnits - (b.actorRef.index + rotation + tick) % maxUnits || a.sequence - b.sequence, this.scan); }
    complete(c: GameplayCommand, r: CommandResult): void { this.lookup();const old = this.#history.get(this.#key(c)); if (old)
        this.#history.set(this.#key(c), { ...old, result: r }); }
    neutralize(): void { this.#cancelled.push(...this.#queue); this.#queue = []; }
    state() { return { queue: this.#queue.map(c => { this.scan('scheduler', 1); return c; }), cancelled: this.#cancelled.map(c => { this.scan('scheduler', 1); return c; }), history: [...this.#history.entries()].map(e => { this.scan('scheduler', 1); return e; }), expired: [...this.#expired.entries()].map(e => { this.scan('scheduler', 1); return e; }) }; }
}

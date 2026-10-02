import type { Vec2 } from '../../../foundation/index';
import type { AreaDef, ContentId, EntityRef, GameplayDef } from '../../../contracts/index';
import { DefinitionIndex } from '../../kernel/definition-index';
import { visits } from '../../shared/work';
import type { Scan } from '../../shared/work';
import type { SpatialGrid } from '../../shared/queries/grid';
export interface AreaInstance {
    id: number;
    definition: ContentId;
    source: EntityRef;
    team: number;
    position: Vec2;
    startTick: number;
    endTick: number;
    nextPulseTick: number;
    members: EntityRef[];
}
export class AreaStore {
    #next = 0;
    #items: AreaInstance[] = [];
    readonly #defs: DefinitionIndex<AreaDef>;
    constructor(readonly config: GameplayDef, readonly scan: Scan, readonly lookup: () => void = () => { }) { this.#defs = new DefinitionIndex(config.areas, () => scan('area', 1)); }
    definition(id: ContentId): AreaDef { return (this.lookup(), this.#defs.get(id)); }
    spawn(definition: ContentId, source: EntityRef, team: number, point: Vec2, tick: number): string | null { if (this.#items.length >= this.config.maxAreas)
        return 'areaQuota'; const d = this.definition(definition); this.#items.push({ id: ++this.#next, definition, source, team, position: { ...point }, startTick: tick, endTick: tick + d.durationTicks, nextPulseTick: tick + (d.firstPulse === 'activation' ? 0 : d.intervalTicks), members: [] }); return null; }
    expire(tick: number, emit: (a: AreaInstance, effect: ContentId, targets: readonly EntityRef[], kind: string) => void, event: (a: AreaInstance, reason: string) => void): void { this.#items = this.#items.filter(a => { this.scan('area', 1); if (tick < a.endTick)
        return true; const d = this.definition(a.definition); if (d.exit && a.members.length)
        emit(a, d.exit, a.members, 'exit'); if (d.expiry)
        emit(a, d.expiry, [a.source], 'expiry'); event(a, 'expiry'); return false; }); }
    update(tick: number, grid: SpatialGrid, emit: (a: AreaInstance, effect: ContentId, targets: readonly EntityRef[], kind: string) => void, event: (a: AreaInstance, reason: string) => void): void {
        const keep: AreaInstance[] = [];
        for (const a of visits(this.#items, this.scan, 'area')) {
            if (tick < a.startTick) {
                keep.push(a);
                continue;
            }
            const d = this.definition(a.definition);
            if (tick >= a.endTick) {
                if (d.exit && a.members.length)
                    emit(a, d.exit, a.members, 'exit');
                if (d.expiry)
                    emit(a, d.expiry, [a.source], 'expiry');
                event(a, 'expiry');
                continue;
            }
            const current = grid.query({ kind: 'radius', center: a.position, radiusWorld: d.radiusWorld }, a.team, d.relation).map(h => { this.scan('area', 1); return h.ref; });
            const prev = new Set<number>();
            for (const r of visits(a.members, this.scan, 'area'))
                prev.add(r.index);
            const next = new Set<number>();
            for (const r of visits(current, this.scan, 'area'))
                next.add(r.index);
            const entered = current.filter(r => { this.scan('area', 1); return (this.lookup(),!prev.has(r.index)); }), exited = a.members.filter(r => { this.scan('area', 1); return (this.lookup(),!next.has(r.index)); });
            if (d.enter && entered.length)
                emit(a, d.enter, entered, 'enter');
            if (d.exit && exited.length)
                emit(a, d.exit, exited, 'exit');
            a.members = current;
            if (tick >= a.nextPulseTick) {
                if (d.pulse && current.length)
                    emit(a, d.pulse, current, 'pulse');
                a.nextPulseTick = tick + d.intervalTicks;
            }
            keep.push(a);
        }
        this.#items = keep;
    }
    deathExit(alive: (ref: EntityRef) => boolean, emit: (a: AreaInstance, effect: ContentId, targets: readonly EntityRef[], kind: string) => void): void {
        for (const a of visits(this.#items, this.scan, 'area')) {
            const d = this.definition(a.definition), exited: EntityRef[] = [], keep: EntityRef[] = [];
            for (const r of visits(a.members, this.scan, 'area'))
                (alive(r) ? keep : exited).push(r);
            a.members = keep;
            if (d.exit && exited.length)
                emit(a, d.exit, exited, 'deathExit');
        }
    }
    snapshot() { return this.#items.map(a => { this.scan('area', 1); return { ...a, position: { ...a.position }, members: a.members.map(r => { this.scan('area', 1); return { ...r }; }) }; }); }
}

import { circleTOI, distance, subtract, unit } from '../../../foundation/index';
import type { Vec2 } from '../../../foundation/index';
import type { EntityRef, GameplayDef, TargetRelation } from '../../../contracts/index';
import { ordered, visits } from '../work';
import type { Scan } from '../work';
export interface SpatialUnit {
    readonly ref: EntityRef;
    readonly team: number;
    readonly position: Vec2;
    readonly previous: Vec2;
    readonly alive: boolean;
    readonly targetable: boolean;
}
export interface SpatialHit {
    readonly ref: EntityRef;
    readonly time: number;
    readonly distanceWorld: number;
}
export type SpatialShape = {
    readonly kind: 'radius';
    readonly center: Vec2;
    readonly radiusWorld: number;
} | {
    readonly kind: 'cone';
    readonly center: Vec2;
    readonly direction: Vec2;
    readonly radiusWorld: number;
    readonly cosine: number;
} | {
    readonly kind: 'sweep';
    readonly from: Vec2;
    readonly to: Vec2;
    readonly radiusWorld: number;
    readonly movingTargets: boolean;
};
export class SpatialGrid {
    readonly #members = new Map<number, Map<number, number>>();
    readonly #cells: SpatialUnit[][];
    readonly #columns: number;
    readonly #rows: number;
    constructor(readonly config: GameplayDef, readonly scan: Scan, readonly countQuery: () => void = () => { },readonly lookup:()=>void=()=>{}) {
        this.#columns = Math.ceil((config.arena.maxX - config.arena.minX) / config.cellSizeWorld);
        this.#rows = Math.ceil((config.arena.maxY - config.arena.minY) / config.cellSizeWorld);
        this.#cells = Array.from({ length: this.#columns * this.#rows }, () => []);
    }
    #cell(p: Vec2): number { return Math.max(0, Math.min(this.#columns - 1, Math.floor((p.xWorld - this.config.arena.minX) / this.config.cellSizeWorld))) + Math.max(0, Math.min(this.#rows - 1, Math.floor((p.yWorld - this.config.arena.minY) / this.config.cellSizeWorld))) * this.#columns; }
    rebuild(units: readonly SpatialUnit[]): void { for (const c of visits(this.#cells, this.scan, 'spatial'))
        c.length = 0; this.#members.clear(); for (const u of visits(units, this.scan, 'spatial'))
        this.update(u); }
    update(u: SpatialUnit): void {
        this.lookup();const old = this.#members.get(u.ref.index);
        if (old)
            for (const [cell, slot] of old) {
                this.scan('spatial', 1);this.lookup();
                const bucket = this.#cells[cell];
                if (!bucket)
                    throw new Error('grid cell');
                const last = bucket.pop();
                if (last && slot < bucket.length) {
                    bucket[slot] = last;
                    this.lookup();this.#members.get(last.ref.index)?.set(cell, slot);
                }
            }
        const slots = new Map<number, number>();
        this.#members.set(u.ref.index, slots);
        // Insert the complete target swept AABB, including intermediate cells. Fast
        // moving targets crossing a projectile are therefore broad-phase candidates.
        const lo = this.#cell({ xWorld: Math.min(u.previous.xWorld, u.position.xWorld), yWorld: Math.min(u.previous.yWorld, u.position.yWorld) }), hi = this.#cell({ xWorld: Math.max(u.previous.xWorld, u.position.xWorld), yWorld: Math.max(u.previous.yWorld, u.position.yWorld) });
        for (let y = Math.floor(lo / this.#columns); y <= Math.floor(hi / this.#columns); y++)
            for (let x = lo % this.#columns; x <= hi % this.#columns; x++) {
                this.scan('spatial', 1);
                this.lookup();const cell = y * this.#columns + x, bucket = this.#cells[cell];
                if (!bucket)
                    throw new Error('grid cell');
                slots.set(cell, bucket.length);
                bucket.push(u);
            }
    }
    candidates(from: Vec2, to: Vec2, radius: number): SpatialUnit[] {
        this.countQuery();
        const lo = this.#cell({ xWorld: Math.min(from.xWorld, to.xWorld) - radius, yWorld: Math.min(from.yWorld, to.yWorld) - radius }), hi = this.#cell({ xWorld: Math.max(from.xWorld, to.xWorld) + radius, yWorld: Math.max(from.yWorld, to.yWorld) + radius });
        const seen = new Set<number>(), result: SpatialUnit[] = [];
        for (let y = Math.floor(lo / this.#columns); y <= Math.floor(hi / this.#columns); y++)
            for (let x = lo % this.#columns; x <= hi % this.#columns; x++) {
                this.scan('spatial', 1);
                this.lookup();const cell = this.#cells[y * this.#columns + x] ?? [];
                for (const u of visits(cell, this.scan, 'spatial')) {this.lookup();
                    if (!seen.has(u.ref.index)) {
                        seen.add(u.ref.index);
                        result.push(u);
                    }}
            }
        return result;
    }
    query(shape: SpatialShape, team: number, relation: TargetRelation, exclude: EntityRef | null = null): SpatialHit[] {
        const from = shape.kind === 'sweep' ? shape.from : shape.center, to = shape.kind === 'sweep' ? shape.to : shape.center;
        const result: SpatialHit[] = [];
        for (const u of visits(this.candidates(from, to, shape.radiusWorld + this.config.radiusWorld), this.scan, 'spatial')) {
            if (!u.alive || !u.targetable || (exclude?.index === u.ref.index && exclude.generation === u.ref.generation) || !matches(team, u.team, relation))
                continue;
            const d = distance(from, u.position);
            let time: number | null = 0;
            if (shape.kind === 'sweep') {
                const old = shape.movingTargets ? u.previous : u.position;
                time = circleTOI(subtract(from, old), subtract(to, u.position), { xWorld: 0, yWorld: 0 }, shape.radiusWorld + this.config.radiusWorld);
            }
            else {
                if (d > shape.radiusWorld + this.config.radiusWorld)
                    continue;
                if (shape.kind === 'cone' && d > 0) {
                    const v = unit(subtract(u.position, from)), dir = unit(shape.direction);
                    if (v.xWorld * dir.xWorld + v.yWorld * dir.yWorld < shape.cosine)
                        continue;
                }
            }
            if (time !== null)
                result.push({ ref: u.ref, time, distanceWorld: d });
        }
        return ordered(result, (a, b) => a.time - b.time || (shape.kind === 'sweep' ? 0 : a.distanceWorld - b.distanceWorld) || a.ref.index - b.ref.index || a.ref.generation - b.ref.generation, this.scan);
    }
}
export function matches(sourceTeam: number, targetTeam: number, relation: TargetRelation): boolean { return relation === 'any' || (relation === 'enemy' ? sourceTeam !== targetTeam : sourceTeam === targetTeam); }

import { along, rectTOI, subtract, unit } from '../../../foundation/index';
import type { Vec2 } from '../../../foundation/index';
import type { ContentId, EntityRef, GameplayDef, ProjectileDef } from '../../../contracts/index';
import { DefinitionIndex } from '../../kernel/definition-index';
import { visits } from '../../shared/work';
import type { Scan } from '../../shared/work';
import type { SpatialGrid } from '../../shared/queries/grid';
export interface ProjectileInstance {
    id: number;
    definition: ContentId;
    source: EntityRef;
    owner: EntityRef;
    team: number;
    position: Vec2;
    previous: Vec2;
    velocity: Vec2;
    startTick: number;
    endTick: number;
    hit: Set<number>;
    ended: boolean;
}
export class ProjectileStore {
    #next = 0;
    #items: ProjectileInstance[] = [];
    readonly #defs: DefinitionIndex<ProjectileDef>;
    constructor(readonly config: GameplayDef, readonly scan: Scan, readonly lookup: () => void = () => { }) { this.#defs = new DefinitionIndex(config.projectiles, () => scan('projectile', 1)); }
    definition(id: ContentId): ProjectileDef { return (this.lookup(), this.#defs.get(id)); }
    spawn(definition: ContentId, source: EntityRef, team: number, position: Vec2, aim: Vec2, tick: number): string | null {
        if (this.#items.length >= this.config.maxProjectiles)
            return 'projectileQuota';
        const d = this.definition(definition), dir = unit(subtract(aim, position));
        if (!dir.xWorld && !dir.yWorld)
            return 'direction';
        this.#items.push({ id: ++this.#next, definition, source, owner: source, team, position: { ...position }, previous: { ...position }, velocity: { xWorld: dir.xWorld * d.speedWorldPerSecond, yWorld: dir.yWorld * d.speedWorldPerSecond }, startTick: tick, endTick: tick + d.lifetimeTicks, hit: new Set(), ended: false });
        return null;
    }
    expire(tick: number, event: (p: ProjectileInstance, reason: string) => void): void { this.#items = this.#items.filter(p => { this.scan('projectile', 1); if (p.ended || tick >= p.endTick) {
        event(p, 'expiry');
        return false;
    } return true; }); }
    advance(tick: number, rate: number, grid: SpatialGrid, hit: (p: ProjectileInstance, effect: ContentId, targets: readonly EntityRef[]) => void, event: (p: ProjectileInstance, reason: string) => void): void {
        const keep: ProjectileInstance[] = [];
        for (const p of visits(this.#items, this.scan, 'projectile')) {
            if (p.ended || tick >= p.endTick) {
                event(p, 'expiry');
                continue;
            }
            if (tick < p.startTick) {
                keep.push(p);
                continue;
            }
            const d = this.definition(p.definition);
            p.previous = { ...p.position };
            const to = { xWorld: p.position.xWorld + p.velocity.xWorld / rate, yWorld: p.position.yWorld + p.velocity.yWorld / rate };
            let wall = 1, blocked = false;
            for (const r of visits(this.config.obstacles, this.scan, 'projectile')) {
                const t = rectTOI(p.position, to, r, d.radiusWorld);
                if (t !== null && t <= wall) {
                    wall = t;
                    blocked = true;
                }
            }
            const a = this.config.arena;
            // Arena boundary is also a collision, not an unbounded off-map query.
            for (const [start, end, lo, hi] of [[p.position.xWorld, to.xWorld, a.minX + d.radiusWorld, a.maxX - d.radiusWorld], [p.position.yWorld, to.yWorld, a.minY + d.radiusWorld, a.maxY - d.radiusWorld]])
                if (start !== undefined && end !== undefined && lo !== undefined && hi !== undefined && end !== start && (end < lo || end > hi)) {
                    wall = Math.min(wall, ((end < lo ? lo : hi) - start) / (end - start));
                    blocked = true;
                }
            const targets: EntityRef[] = [];
            for (const h of visits(grid.query({ kind: 'sweep', from: p.position, to, radiusWorld: d.radiusWorld, movingTargets: true }, p.team, d.relation, p.source), this.scan, 'projectile')) {
                if (h.time > wall || blocked && h.time === wall || (this.lookup(),p.hit.has(h.ref.index)))
                    continue;
                p.hit.add(h.ref.index);
                targets.push(h.ref);
                if (d.hits === 'single') {
                    wall = h.time;
                    p.ended = true;
                    break;
                }
            }
            p.position = along(p.position, to, Math.max(0, wall));
            if (targets.length)
                hit(p, d.effect, targets);
            if (blocked || p.ended)
                event(p, p.ended ? 'hit' : 'wall');
            else
                keep.push(p);
        }
        this.#items = keep;
    }
    snapshot() { return this.#items.map(p => { this.scan('projectile', 1); const hit: number[] = []; for (const id of p.hit) {
        this.scan('projectile', 1);
        hit.push(id);
    } return { ...p, position: { ...p.position }, previous: { ...p.previous }, velocity: { ...p.velocity }, hit }; }); }
}

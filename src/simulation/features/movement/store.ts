import { along, movementCircleTOI, distance, movementRectTOI, subtract, unit } from '../../../foundation/index';
import type { Vec2 } from '../../../foundation/index';
import type { EntityRef, GameplayDef, Leaf } from '../../../contracts/index';
import { visits } from '../../shared/work';
import type { Scan } from '../../shared/work';
import type { SpatialGrid } from '../../shared/queries/grid';
interface Motion {
    ref: EntityRef;
    position: Vec2;
    previous: Vec2;
    facing: Vec2;
    intent: Vec2;
    discontinuity: boolean;
    travel: {
        mode: 'dash' | 'forced';
        destination: Vec2;
        speed: number;
        wall: 'stop' | 'ignore';
        units: 'stop' | 'ignore';
    } | null;
}
export class MovementStore {
    readonly #motions: Motion[];
    constructor(readonly config: GameplayDef, refs: readonly EntityRef[], readonly scan: Scan, readonly lookup: () => void = () => { }) { this.#motions = refs.map((ref, i) => { scan('movement', 1); const s = config.spawns[i]; if (!s)
        throw new Error('spawn mismatch'); return { ref, position: { ...s.position }, previous: { ...s.position }, facing: { xWorld: 1, yWorld: 0 }, intent: { xWorld: 0, yWorld: 0 }, discontinuity: false, travel: null }; }); }
    get(ref: EntityRef): Motion { this.lookup(); const m = this.#motions[ref.index]; if (!m || m.ref.generation !== ref.generation)
        throw new Error('movement handle'); return m; }
    intent(ref: EntityRef, d: Vec2): void { const m = this.get(ref); m.intent = { ...d }; if (d.xWorld || d.yWorld)
        m.facing = unit(d); }
    neutralize(): void { for (const m of visits(this.#motions, this.scan, 'movement'))
        m.intent = { xWorld: 0, yWorld: 0 }; }
    begin(): void { for (const m of visits(this.#motions, this.scan, 'movement')) {
        m.previous = { ...m.position };
        m.discontinuity = false;
    } }
    interrupt(ref: EntityRef, forced: boolean): void { const m = this.get(ref); m.intent = { xWorld: 0, yWorld: 0 }; if (forced || m.travel?.mode === 'dash')
        m.travel = null; }
    stop(ref: EntityRef): void { const m = this.get(ref); m.intent = { xWorld: 0, yWorld: 0 }; m.travel = null; }
    displace(ref: EntityRef, point: Vec2, p: Extract<Leaf, {
        kind: 'displace';
    }>, grid: SpatialGrid): void {
        const m = this.get(ref), d = unit(subtract(point, m.position)), destination = { xWorld: m.position.xWorld + d.xWorld * p.distanceWorld, yWorld: m.position.yWorld + d.yWorld * p.distanceWorld };
        if (p.mode === 'dash' || p.mode === 'forced') {
            m.travel = { mode: p.mode, destination, speed: p.speedWorldPerSecond, wall: p.wall, units: p.units };
            m.intent = { xWorld: 0, yWorld: 0 };
            return;
        }
        if (p.mode === 'teleport') {
            const clamped = this.#clamp(destination);
            if (p.wall === 'stop' && this.blocked(clamped))
                return;
            if (p.units === 'stop')
                for (const u of visits(grid.candidates(clamped, clamped, 2 * this.config.radiusWorld), this.scan, 'movement'))
                    if (u.alive && u.ref.index !== ref.index && distance(u.position, clamped) < 2 * this.config.radiusWorld)
                        return;
            m.position = clamped;
            m.previous = { ...clamped };
            m.discontinuity = true;
            m.travel = null;
            m.intent = { xWorld: 0, yWorld: 0 };
        }
        else {
            m.position = this.resolve(m, destination, p.wall, p.units, grid);
            m.travel = null;
            m.intent = { xWorld: 0, yWorld: 0 };
        }
    }
    #clamp(p: Vec2): Vec2 { const a = this.config.arena, r = this.config.radiusWorld; return { xWorld: Math.max(a.minX + r, Math.min(a.maxX - r, p.xWorld)), yWorld: Math.max(a.minY + r, Math.min(a.maxY - r, p.yWorld)) }; }
    blocked(p: Vec2): boolean { for (const r of visits(this.config.obstacles, this.scan, 'movement')) {
        const x = Math.max(r.minX, Math.min(r.maxX, p.xWorld)), y = Math.max(r.minY, Math.min(r.maxY, p.yWorld));
        if (distance(p, { xWorld: x, yWorld: y }) < this.config.radiusWorld)
            return true;
    } return false; }
    resolve(m: Motion, to: Vec2, wall: 'stop' | 'ignore', units: 'stop' | 'ignore', grid: SpatialGrid): Vec2 {
        const end = this.#clamp(to);
        let time = 1;
        if (wall === 'stop')
            for (const r of visits(this.config.obstacles, this.scan, 'movement')) {
                const t = movementRectTOI(m.position, end, r, this.config.radiusWorld);
                if (t !== null)
                    time = Math.min(time, t);
            }
        if (units === 'stop')
            for (const u of visits(grid.candidates(m.position, end, 2 * this.config.radiusWorld), this.scan, 'movement'))
                if (u.alive && u.ref.index !== m.ref.index) {
                    const t = movementCircleTOI(m.position, end, u.position, 2 * this.config.radiusWorld);
                    if (t !== null)
                        time = Math.min(time, t);
                }
        return along(m.position, end, time);
    }
    advance(capability:(ref:EntityRef)=>{canMove:boolean;canDisplace:boolean;alive:boolean;speed:number},runStep:(ref:EntityRef)=>void):void {
        const resolved=new Set<number>();
        for(const mode of ['forced','dash','normal'] as const)for(const m of visits(this.#motions,this.scan,'movement')){
            this.lookup();if(resolved.has(m.ref.index))continue;const c=capability(m.ref);
            if(!c.alive){this.stop(m.ref);continue;}
            if(m.travel&&m.travel.mode!==mode||!m.travel&&mode!=='normal')continue;
            resolved.add(m.ref.index);
            if(!m.travel&&(!c.canMove||!m.intent.xWorld&&!m.intent.yWorld)){m.intent={xWorld:0,yWorld:0};continue;}
            runStep(m.ref);
        }
    }
    step(ref:EntityRef,rate:number,grid:SpatialGrid,c:{canMove:boolean;canDisplace:boolean;alive:boolean;speed:number}):void {
        const m=this.get(ref);if(!c.alive){this.stop(ref);return;}
        if(m.travel){
            if(!c.canDisplace||m.travel.mode==='dash'&&!c.canMove){m.travel=null;return;}
            const t=m.travel,n=distance(m.position,t.destination),to=along(m.position,t.destination,n?Math.min(1,t.speed/rate/n):1),next=this.resolve(m,to,t.wall,t.units,grid);
            if(distance(next,to)>1e-8||distance(next,t.destination)<1e-8)m.travel=null;
            m.position=next;
        }else if(c.canMove){const to={xWorld:m.position.xWorld+m.intent.xWorld*c.speed/rate,yWorld:m.position.yWorld+m.intent.yWorld*c.speed/rate};m.position=this.resolve(m,to,'stop','stop',grid);}
        else m.intent={xWorld:0,yWorld:0};
    }
    snapshot() { return this.#motions.map(m => { this.scan('movement', 1); return { ...m, position: { ...m.position }, previous: { ...m.previous }, intent: { ...m.intent }, facing: { ...m.facing }, travel: m.travel ? { ...m.travel, destination: { ...m.travel.destination } } : null }; }); }
}

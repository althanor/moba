import type { Vec2 } from '../../foundation/index';
import type { EntityRef } from '../components/entity';
import type { ActionDef, RectWorld } from '../content/gameplay';
export interface BattleUnitView {
    readonly ref: EntityRef;
    readonly team: number;
    readonly previous: Vec2;
    readonly position: Vec2;
    readonly facing: Vec2;
    readonly discontinuity: boolean;
    readonly alive: boolean;
    readonly canMove: boolean;
    readonly speedWorldPerSecond: number;
    readonly shield: number;
    readonly health: number;
    readonly maximumHealth: number;
    readonly resource: number;
    readonly maximumResource: number;
    readonly reserved: number;
    readonly statuses: readonly string[];
    readonly phase: string;
    readonly lock: EntityRef | null;
    readonly cooldowns: readonly {
        readonly id: string;
        readonly readyTick: number;
        readonly charges: number;
    }[];
}
export interface BattleView {
    readonly disclosure: 'public-debug-arena-v1';
    readonly player: EntityRef;
    readonly units: readonly BattleUnitView[];
    readonly projectiles: readonly {
        readonly id: number;
        readonly previous: Vec2;
        readonly position: Vec2;
        readonly radiusWorld: number;
    }[];
    readonly areas: readonly {
        readonly id: number;
        readonly position: Vec2;
        readonly radiusWorld: number;
        readonly endTick: number;
    }[];
    readonly obstacles: readonly RectWorld[];
    readonly arena: RectWorld;
    readonly actions: readonly ActionDef[];
}

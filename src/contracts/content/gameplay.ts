import type { Vec2 } from '../../foundation/index';
import type { EntityRef } from '../components/entity';
import type { ContentId } from './id';
export interface RectWorld {
    readonly minX: number;
    readonly minY: number;
    readonly maxX: number;
    readonly maxY: number;
}
export type TargetRelation = 'enemy' | 'ally' | 'any';
export interface ActionDef {
    readonly id: ContentId;
    readonly basic: boolean;
    readonly target: 'self' | 'unit' | 'point' | 'direction';
    readonly relation: TargetRelation;
    readonly rangeWorld: number;
    readonly radiusWorld: number;
    readonly windupTicks: number;
    readonly castTicks: number;
    readonly activeTicks: number;
    readonly recoveryTicks: number;
    readonly cooldownTicks: number;
    readonly cooldownStart: 'start' | 'release' | 'end';
    readonly cancelCooldownTicks: number;
    readonly maxCharges: number;
    readonly rechargeTicks: number;
    readonly cost: {
        readonly resource: ContentId;
        readonly amount: number;
        readonly policy: 'start' | 'release';
        readonly refundFraction: number;
    };
    readonly cancelBeforeRelease: boolean;
    readonly cancelRecovery: boolean;
    readonly interruptOnControl: boolean;
    readonly effect: ContentId;
    readonly delivery: 'instant' | 'projectile' | 'area' | 'displacement';
}
export interface ProjectileDef {
    readonly id: ContentId;
    readonly speedWorldPerSecond: number;
    readonly radiusWorld: number;
    readonly lifetimeTicks: number;
    readonly hits: 'single' | 'multi';
    readonly relation: TargetRelation;
    readonly effect: ContentId;
    readonly sourcePolicy: 'impactAttributesContinueAfterDeath';
}
export interface AreaDef {
    readonly id: ContentId;
    readonly radiusWorld: number;
    readonly durationTicks: number;
    readonly intervalTicks: number;
    readonly firstPulse: 'activation' | 'interval';
    readonly relation: TargetRelation;
    readonly enter: ContentId | null;
    readonly pulse: ContentId | null;
    readonly exit: ContentId | null;
    readonly expiry: ContentId | null;
}
export interface GameplayDef {
    readonly speedAttribute: ContentId;
    readonly radiusWorld: number;
    readonly arena: RectWorld;
    readonly cellSizeWorld: number;
    readonly obstacles: readonly RectWorld[];
    readonly maxProjectiles: number;
    readonly maxAreas: number;
    readonly actions: readonly ActionDef[];
    readonly projectiles: readonly ProjectileDef[];
    readonly areas: readonly AreaDef[];
    readonly spawns: readonly {
        readonly position: Vec2;
        readonly team: number;
        readonly controller: string | null;
    }[];
}
export interface ActionInstance {
    readonly id: string;
    readonly definition: ContentId;
    readonly targetRef: EntityRef | null;
    readonly aim: Vec2;
    readonly startedTick: number;
    readonly releaseTick: number;
    readonly activeEndTick: number;
    readonly endTick: number;
    readonly phase: 'windup' | 'cast' | 'active' | 'recovery';
    readonly released: boolean;
}
export interface GameplayAim {readonly intentDirection?:Vec2;
    readonly point: Vec2;
    readonly target: EntityRef | null;
    readonly reservation: string | null;
}

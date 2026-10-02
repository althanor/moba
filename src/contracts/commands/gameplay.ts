import type { MatchId, Vec2 } from '../../foundation/index';
import type { EntityRef } from '../components/entity';
import type { ContentId } from '../content/catalog';
export interface GameplayCommand {
    readonly matchId: MatchId;
    readonly controllerId: string;
    readonly sequence: number;
    readonly targetTick: number;
    readonly actorRef: EntityRef;
    readonly kind: 'move' | 'cast' | 'cancelAction' | 'targetLock';
    readonly payload: {
        readonly direction: Vec2;
        readonly point: Vec2;
        readonly action: ContentId | null;
        readonly target: EntityRef | null;
    };
}

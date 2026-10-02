import type { BattleView } from './battle';
import type { MatchId, SessionId, TickIndex } from '../../foundation/index';
import type { EntityRef, MotionSample } from '../components/entity';
export interface PerceptionEvent { readonly publicEventId: string; readonly observedTick: TickIndex; readonly expiresTick: TickIndex }
export interface Observation {
  readonly sessionId: SessionId;
  readonly matchId: MatchId;
  readonly observer: 'probe-player';
  readonly team: 0;
  readonly tick: TickIndex;
  readonly entities: readonly MotionSample[];
  readonly battle?: BattleView;
}
export interface RenderDelta {
  readonly sessionId: SessionId;
  readonly tick: TickIndex;
  readonly created: readonly MotionSample[];
  readonly changed: readonly MotionSample[];
  readonly removed: readonly EntityRef[];
  readonly perceptionEvents: readonly PerceptionEvent[];
}

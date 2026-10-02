import type { MatchId, TickIndex, Vec2 } from '../../foundation/index';
import type { EntityRef } from '../components/entity';
// Only an M1 response fixture. No Move/Attack/Cast gameplay API yet.
export interface ProbeCommand {
  readonly matchId: MatchId;
  readonly controllerId: 'probe-player';
  readonly sequence: number;
  readonly targetTick: TickIndex;
  readonly actorRef: EntityRef;
  readonly kind: 'debugProbeDirection';
  readonly payload: Vec2;
}
export type RejectReason = 'schema' | 'wrongMatch' | 'wrongController' | 'invalidActor' | 'staleTick' | 'futureTick' | 'queueFull' | 'seatLimit' | 'sequenceConflict' | 'sequenceExpired' | 'inputCleared' | 'disposed' | 'content' | 'producerLimit' | 'targetCapacity' | 'fault';
export interface CommandResult {
  readonly sequence: number;
  readonly tick: TickIndex;
  readonly outcome: 'queued' | 'accepted' | 'rejected';
  readonly reason: RejectReason | null;
}

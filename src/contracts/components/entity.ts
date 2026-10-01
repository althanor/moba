import type { SessionId, Vec2 } from '../../foundation/index';
export interface EntityRef { readonly index: number; readonly generation: number }
export interface ScopedEntityRef { readonly sessionId: SessionId; readonly ref: EntityRef }
export interface MotionSample {
  readonly ref: EntityRef;
  readonly previous: Vec2;
  readonly current: Vec2;
  readonly discontinuity: boolean;
}

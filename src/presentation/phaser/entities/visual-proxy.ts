import { finite } from '../../../foundation/index';
import type { Vec2 } from '../../../foundation/index';
import type { MotionSample, Observation } from '../../../contracts/index';
export function interpolate(sample: MotionSample, alpha: number): Vec2 {
  const amount = Math.max(0, Math.min(1, finite(alpha, 'alpha')));
  if (sample.discontinuity) return sample.current;
  return Object.freeze({ xWorld: sample.previous.xWorld + (sample.current.xWorld - sample.previous.xWorld) * amount,
    yWorld: sample.previous.yWorld + (sample.current.yWorld - sample.previous.yWorld) * amount });
}
// This class contains only copied presentation coordinates and receives no simulation port.
export class VisualProxy {
  #tick = -1;
  #session = '';
  #sampleAtMs = 0;
  #lastAuthority: Vec2 | null = null;
  #lastIntent: Vec2 | null = null;
  #wasPredicting = false;
  correctionWorld = 0;
  reconciled = false;
  position(observation: Observation, alpha: number, nowMs: number, intent: Vec2, enabled: boolean, stepMs: number, speedWorldPerSecond: number): Vec2 | null {
    const sample = observation.entities[0];
    if (!sample) { this.clear(); return null; }
    const newSession = observation.sessionId !== this.#session;
    if (newSession) this.clear();
    this.correctionWorld = 0;
    this.reconciled = false;
    if (observation.tick !== this.#tick || newSession) {
      // Compare the previous prediction at the new authoritative Tick, rather than
      // miscounting ordinary travel since the last rendered frame as an error.
      if (this.#wasPredicting && this.#lastAuthority && this.#lastIntent && !sample.discontinuity) {
        const predictedMs = Math.min(1, Math.max(0, observation.tick - this.#tick)) * stepMs;
        const expectedX = this.#lastAuthority.xWorld + this.#lastIntent.xWorld * speedWorldPerSecond * predictedMs / 1000;
        const expectedY = this.#lastAuthority.yWorld + this.#lastIntent.yWorld * speedWorldPerSecond * predictedMs / 1000;
        this.correctionWorld = Math.hypot(expectedX - sample.current.xWorld, expectedY - sample.current.yWorld);
        this.reconciled = true;
      }
      this.#tick = observation.tick; this.#session = observation.sessionId; this.#sampleAtMs = nowMs;
    }
    const predicting = enabled && !sample.discontinuity && (intent.xWorld !== 0 || intent.yWorld !== 0);
    const durationMs = Math.max(0, Math.min(stepMs, nowMs - this.#sampleAtMs));
    const position = predicting ? Object.freeze({ xWorld: sample.current.xWorld + intent.xWorld * speedWorldPerSecond * durationMs / 1000,
      yWorld: sample.current.yWorld + intent.yWorld * speedWorldPerSecond * durationMs / 1000 }) : interpolate(sample, alpha);
    this.#wasPredicting = predicting; this.#lastAuthority = sample.current; this.#lastIntent = Object.freeze({ ...intent });
    return position;
  }
  clear(): void { this.#tick = -1; this.#session = ''; this.#sampleAtMs = 0; this.#lastAuthority = null; this.#lastIntent = null; this.#wasPredicting = false; this.correctionWorld = 0; this.reconciled = false; }
}

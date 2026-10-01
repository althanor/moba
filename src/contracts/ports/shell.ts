import type { MatchId, SessionId, TickIndex, Vec2 } from '../../foundation/index';
import type { CommandResult } from '../commands/probe';
import type { Observation, RenderDelta } from '../observations/shell';
export interface ShellConfig {
  readonly sessionId: SessionId;
  readonly matchId: MatchId;
  readonly tickRate: number;
  readonly mode: 'empty' | 'response-probe';
  readonly probeSpeedWorldPerSecond: number;
}
export interface TickOutput {
  readonly observation: Observation;
  readonly renderDelta: RenderDelta;
  readonly commandResults: readonly CommandResult[];
}
export interface SimulationPort {
  enqueue(command: unknown): CommandResult;
  step(): TickOutput;
  observe(): Observation;
  debugHash(): string;
  neutralizeInput(): void;
  dispose(): void;
}
export interface CommandSink { submit(command: unknown): CommandResult }
export interface ObservationSource { observe(): Observation }
export interface CheckpointCodec<DTO> { encode(dto: DTO): string; decode(bytes: string): DTO }
export type PauseReason = 'user' | 'hidden' | 'orientation' | 'contextLost' | 'overload' | 'fault';
export type SessionState = 'loading' | 'running' | 'paused' | 'ended' | 'disposed';
export interface RawInput {
  readonly sampleId: number;
  readonly pointerId: number;
  readonly phase: 'begin' | 'move' | 'end' | 'cancel';
  readonly screenCssX: number;
  readonly screenCssY: number;
  readonly capturedAtMs: number;
}
export interface ControllerInput { readonly direction: Vec2; readonly sampleId: number | null }
export type ProbeMode = 'A' | 'B';
export interface DebugSnapshot {
  readonly state: SessionState;
  readonly pauseReasons: readonly PauseReason[];
  readonly tick: TickIndex;
  readonly tickRate: number;
  readonly hash: string;
  readonly backlogMs: number;
  readonly ticksThisFrame: number;
}
export interface PresentationFrame {
  readonly observation: Observation;
  readonly delta: RenderDelta | null;
  readonly alpha: number;
  readonly debug: DebugSnapshot;
  readonly probeMode: ProbeMode;
  readonly localDirection: Vec2;
  readonly localSampleId: number | null;
  readonly authoritativeSampleId: number | null;
  readonly inputEnabled: boolean;
}
export type DebugAction = 'pause' | 'resume' | 'step' | 'recreate' | 'modeA' | 'modeB' | 'export' | 'empty' | 'probe';
export interface PresentationHost {
  nowMs(): number;
  frame(nowMs: number): PresentationFrame;
  input(sample: RawInput, widthCss: number): void;
  clearInput(): void;
  debug(action: DebugAction): void;
  markUI(sampleId: number, atMs: number): void;
  markVisual(sampleId: number, atMs: number): void;
  correction(distanceWorld: number): void;
  frameCpu(durationMs: number): void;
}

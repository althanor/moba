import { direction, integer } from '../../foundation/index';
import type { CommandResult, DebugSnapshot, Observation, PauseReason, ProbeCommand, RenderDelta, SessionState, ShellConfig, SimulationPort, TickOutput } from '../../contracts/index';
import type { Vec2 } from '../../foundation/index';
import { FixedTick } from './fixed-tick';

export interface SessionHooks {
  readonly clearInput: () => void;
  readonly beforeTick: (session: Session) => void;
  readonly completedTick: (output: TickOutput) => void;
  readonly measureTick?: (step: () => TickOutput) => TickOutput;
}
export class Session {
  readonly config: ShellConfig;
  readonly #simulation: SimulationPort;
  readonly #hooks: SessionHooks;
  readonly #clock: FixedTick;
  #state: SessionState = 'loading';
  #reasons = new Set<PauseReason>();
  #sequence = 0;
  #observation: Observation;
  #delta: RenderDelta | null = null;
  #stepping = false;
  #pendingDispose = false;
  #pendingEnd = false;
  #alpha = 0;
  #backlogMs = 0;
  #ticksThisFrame = 0;
  constructor(config: ShellConfig, simulation: SimulationPort, hooks: SessionHooks) {
    this.config = Object.freeze({ ...config }); this.#simulation = simulation; this.#hooks = hooks;
    this.#clock = new FixedTick(config.tickRate); this.#observation = simulation.observe();
  }
  start(): void { if (this.#state !== 'loading') throw new Error('start requires loading'); this.#state = 'running'; }
  get state(): SessionState { return this.#state; }
  get observation(): Observation { return this.#observation; }
  get delta(): RenderDelta | null { return this.#delta; }
  get alpha(): number { return this.#alpha; }
  command(intent: Vec2): CommandResult | null {
    const actorRef = this.#observation.entities[0]?.ref;
    if (!actorRef || (this.#state !== 'running' && !this.#stepping)) return null;
    this.#sequence = integer(this.#sequence + 1, 'sequence', 1);
    const command: ProbeCommand = { matchId: this.config.matchId, controllerId: 'probe-player', sequence: this.#sequence,
      targetTick: (this.#observation.tick + 1) as ProbeCommand['targetTick'], actorRef, kind: 'debugProbeDirection', payload: intent };
    return this.#simulation.enqueue(command);
  }
  pause(reason: PauseReason): void {
    if (this.#state === 'disposed' || this.#state === 'ended') return;
    this.#reasons.add(reason); this.#hooks.clearInput(); this.#simulation.neutralizeInput();
    this.#clock.reset(); this.#alpha = 0;
    if (!this.#stepping) this.#state = 'paused';
  }
  releaseReason(reason: PauseReason): void { if (reason !== 'fault') this.#reasons.delete(reason); }
  resume(): boolean {
    if (this.#state !== 'paused' || this.#reasons.size) return false;
    this.#clock.reset(); this.#backlogMs = 0; this.#state = 'running'; return true;
  }
  frame(nowMs: number): void {
    this.#ticksThisFrame = 0;
    if (this.#state !== 'running') return;
    try {
      const result = this.#clock.pulse(nowMs, () => { this.#step(); return this.#state === 'running'; });
      this.#alpha = result.alpha; this.#ticksThisFrame = result.ticks; this.#backlogMs = result.backlogMs;
      if (result.overload) this.pause('overload');
    } catch (error) { this.pause('fault'); throw error; }
  }
  singleStep(): boolean {
    if (this.#state !== 'paused' || [...this.#reasons].some(reason => reason !== 'user')) return false;
    this.#step(); this.#alpha = 1; return true;
  }
  #step(): void {
    if (this.#stepping) throw new Error('reentrant Tick');
    this.#stepping = true;
    try {
      this.#hooks.beforeTick(this);
      const output = this.#hooks.measureTick ? this.#hooks.measureTick(() => this.#simulation.step()) : this.#simulation.step();
      this.#observation = output.observation; this.#delta = output.renderDelta;
      this.#hooks.completedTick(output);
    } catch (error) { this.#reasons.add('fault'); this.#state = 'paused'; this.#clock.reset(); this.#hooks.clearInput(); throw error; }
    finally {
      this.#stepping = false;
      if (this.#pendingDispose) this.dispose();
      else if (this.#pendingEnd) { this.#pendingEnd = false; this.#state = 'ended'; }
      else if (this.#reasons.size && this.#state !== 'disposed') this.#state = 'paused';
    }
  }
  debug(): DebugSnapshot {
    return Object.freeze({ state: this.#state, pauseReasons: Object.freeze([...this.#reasons].sort()), tick: this.#observation.tick,
      tickRate: this.config.tickRate, hash: this.#state === 'disposed' ? 'disposed' : this.#simulation.debugHash(),
      backlogMs: this.#backlogMs, ticksThisFrame: this.#ticksThisFrame });
  }
  end(): void {
    if (this.#state === 'disposed') return;
    this.pause('user'); if (this.#stepping) this.#pendingEnd = true; else this.#state = 'ended';
  }
  dispose(): void {
    if (this.#state === 'disposed') return;
    if (this.#stepping) { this.#pendingDispose = true; return; }
    this.#hooks.clearInput(); this.#clock.reset(); this.#simulation.dispose(); this.#reasons.clear();
    this.#state = 'disposed'; this.#delta = null;
    this.#observation = Object.freeze({ ...this.#observation, entities: Object.freeze([]) });
  }
}
export const NEUTRAL = direction(0, 0);

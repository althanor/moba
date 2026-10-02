import { RingBuffer } from '../../foundation/index';
import type { BattleView,RawInput } from '../../contracts/index';
interface Trace { readonly sample: RawInput; readonly interaction: string; rejection?:string;releasedAtMs?:number; queuedAtMs?: number; acceptedAtMs?: number; authoritativeAtMs?: number; uiAtMs?: number; visualAtMs?: number }
export function stats(values: readonly number[]): Readonly<{ count: number; p50: number | null; p95: number | null; p99: number | null; max: number | null }> {
  const sorted = [...values].sort((a, b) => a - b);
  const quantile = (p: number): number | null => sorted[Math.max(0, Math.ceil(sorted.length * p) - 1)] ?? null;
  return { count: sorted.length, p50: quantile(0.5), p95: quantile(0.95), p99: quantile(0.99), max: sorted.at(-1) ?? null };
}
export class ProbeRecorder {
  #lastBattle:BattleView|null=null;#gameplay=new RingBuffer<{tick:number;atMs:number;kind:string;actor:number|null}>(2000);
  #traces = new Map<number, Trace>();
  #frames = new RingBuffer<number>(2000);
  #ticks = new RingBuffer<number>(2000);
  #frameCpu = new RingBuffer<number>(2000);
  #corrections = new RingBuffer<number>(2000);
  #lastFrameMs: number | null = null;
  #startedAtMs: number;
  #totalTickCpuMs = 0;
  #totalTicks = 0;
  #totalFrameCpuMs = 0;
  constructor(nowMs: number) { this.#startedAtMs = nowMs; }
  gameplay(view:BattleView,tick:number,atMs:number):void{
    const old=this.#lastBattle;for(const u of view.units){const p=old?.units[u.ref.index];if(!p)continue;for(const [changed,kind]of [[u.canMove!==p.canMove,u.canMove?'ControlEnded':'ControlStarted'],[u.phase!==p.phase,`ActionPhase:${u.phase}`],[u.health!==p.health,'HealthChanged']] as const)if(changed)this.#gameplay.push({tick,atMs,kind,actor:u.ref.index});}
    if(old&&old.projectiles.length!==view.projectiles.length)this.#gameplay.push({tick,atMs,kind:'ProjectileCountChanged',actor:null});if(old&&old.areas.length!==view.areas.length)this.#gameplay.push({tick,atMs,kind:'AreaCountChanged',actor:null});this.#lastBattle=view;
  }
  capture(sample: RawInput, interaction='probe'): void {
    this.#traces.set(sample.sampleId, { sample, interaction });
    if (this.#traces.size > 2000) { const first = this.#traces.keys().next().value; if (first !== undefined) this.#traces.delete(first); }
  }
  queued(sampleId: number, atMs: number): void { const trace = this.#traces.get(sampleId); if (trace) trace.queuedAtMs = atMs; }
  accepted(sampleId: number, atMs: number, moved: boolean): void { const trace = this.#traces.get(sampleId); if (trace) { trace.acceptedAtMs = atMs; if (moved) trace.authoritativeAtMs = atMs; } }
  rejected(sampleId:number,reason:string):void{const t=this.#traces.get(sampleId);if(t)t.rejection=reason;}
  released(sampleId:number,atMs:number):void{const t=this.#traces.get(sampleId);if(t)t.releasedAtMs=atMs;}
  ui(sampleId: number, atMs: number): void { const trace = this.#traces.get(sampleId); if (trace && trace.uiAtMs === undefined) trace.uiAtMs = atMs; }
  visual(sampleId: number, atMs: number): void { const trace = this.#traces.get(sampleId); if (trace && trace.visualAtMs === undefined) trace.visualAtMs = atMs; }
  frame(atMs: number): void { if (this.#lastFrameMs !== null) this.#frames.push(atMs - this.#lastFrameMs); this.#lastFrameMs = atMs; }
  tick(cpuMs: number): void { this.#ticks.push(cpuMs); this.#totalTickCpuMs += cpuMs; this.#totalTicks++; }
  correction(distanceWorld: number): void { this.#corrections.push(distanceWorld); }
  frameCpu(durationMs: number): void { this.#frameCpu.push(durationMs); this.#totalFrameCpuMs += durationMs; }
  export(nowMs: number): object {
    const traces = [...this.#traces.values()].map(trace => ({ ...trace, sample: { ...trace.sample } }));
    const delays = (field: 'releasedAtMs' | 'uiAtMs' | 'visualAtMs' | 'authoritativeAtMs' | 'queuedAtMs' | 'acceptedAtMs'): number[] => traces.flatMap(trace => trace[field] === undefined ? [] : [(trace[field] ?? 0) - trace.sample.capturedAtMs]);
    return { timing: 'software capture / CPU submission; physical touch-to-photon unavailable', durationMs: nowMs - this.#startedAtMs,
      retainedSampleCount: traces.length, traceCapacity: 2000, totalTicks: this.#totalTicks,
      touchToUI: stats(delays('uiAtMs')), touchToVisual: stats(delays('visualAtMs')), touchToAuthority: stats(delays('authoritativeAtMs')),
      captureToQueue: stats(delays('queuedAtMs')), captureToAcceptance: stats(delays('acceptedAtMs')), captureToRelease:stats(delays('releasedAtMs')),
      tickCpuMs: stats(this.#ticks.values()), frameMs: stats(this.#frames.values()), correctionWorld: stats(this.#corrections.values()),
      frameCpuMs: stats(this.#frameCpu.values()), measuredFrameCpuMsPerSecond: this.#totalFrameCpuMs / Math.max(0.001, (nowMs - this.#startedAtMs) / 1000),
      cpuScope: 'simulation.step total; frame interval from Scene.update to POST_RENDER (includes simulation, presentation, diagnostics; excludes browser/compositor work outside this interval)',
      reconciliation: { retainedCount: this.#corrections.size, correctionCount: this.#corrections.values().filter(value => value > 0.000001).length,
        correctionFraction: this.#corrections.size ? this.#corrections.values().filter(value => value > 0.000001).length / this.#corrections.size : null,
        errorDefinition: 'previous one-step prediction aligned to next observed authoritative Tick; late samples beyond one step remain capped' },
      totalSimulationCpuMs: this.#totalTickCpuMs, simulationCpuMsPerSecond: this.#totalTickCpuMs / Math.max(0.001, (nowMs - this.#startedAtMs) / 1000),
      gameplayEvents:this.#gameplay.values(),battery: 'unavailable; record manually', thermal: 'unavailable; record manually', phaseCpu: 'total Simulation.step; phase-specific CPU is not measured', traces,
      byInteraction: Object.fromEntries([...new Set(traces.map(t=>t.interaction))].map(interaction=>{
        const group=traces.filter(t=>t.interaction===interaction);
        const values=(field:'uiAtMs'|'visualAtMs'|'acceptedAtMs'|'authoritativeAtMs')=>group.flatMap(t=>t[field]===undefined?[]:[(t[field]??0)-t.sample.capturedAtMs]);
        return [interaction,{captured:group.length,ui:stats(values('uiAtMs')),visual:stats(values('visualAtMs')),acceptance:stats(values('acceptedAtMs')),authorityMovement:stats(values('authoritativeAtMs'))}];
      })),
      byPhase: Object.fromEntries(['begin', 'move', 'end', 'cancel'].map(phase => {
        const group = traces.filter(trace => trace.sample.phase === phase);
        const phaseDelays = (field: 'uiAtMs' | 'visualAtMs' | 'authoritativeAtMs'): number[] => group.flatMap(trace => trace[field] === undefined ? [] : [(trace[field] ?? 0) - trace.sample.capturedAtMs]);
        return [phase, { captured: group.length, ui: stats(phaseDelays('uiAtMs')), visual: stats(phaseDelays('visualAtMs')), authority: stats(phaseDelays('authoritativeAtMs')) }];
      })),
      frameSamplesMs: this.#frames.values(), tickSamplesMs: this.#ticks.values(), correctionSamplesWorld: this.#corrections.values() };
  }
}

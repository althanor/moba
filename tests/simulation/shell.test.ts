import { describe, expect, it } from 'vitest';
import { direction, matchId, sessionId, tick } from '../../src/foundation/index';
import type { ProbeCommand, ShellConfig } from '../../src/contracts/index';
import { createSimulation } from '../../src/simulation/index';
import { interpolate, VisualProxy } from '../../src/presentation/probe';
const config = (mode: ShellConfig['mode'] = 'response-probe'): ShellConfig => ({ sessionId: sessionId('s'), matchId: matchId('m'), tickRate: 30, mode, probeSpeedWorldPerSecond: 180 });
describe('M1 simulation boundary', () => {
  it('empty simulation advances only integer time and outputs empty authorised streams', () => {
    const simulation = createSimulation(config('empty')); const output = simulation.step();
    expect(output.observation.entities).toEqual([]); expect(output.observation.tick).toBe(1);
    expect(output.renderDelta).toMatchObject({ created: [], changed: [], removed: [], perceptionEvents: [] });
    expect(Object.keys(simulation)).not.toContain('world'); simulation.dispose(); simulation.dispose(); expect(() => simulation.step()).toThrow();
  });
  it('copies commands and frozen observations; presentation cannot mutate live World', () => {
    const simulation = createSimulation(config()); const ref = simulation.observe().entities[0]?.ref;
    if (!ref) throw new Error('probe absent');
    const command: ProbeCommand = { matchId: matchId('m'), controllerId: 'probe-player', sequence: 1, targetTick: tick(1), actorRef: ref, kind: 'debugProbeDirection', payload: direction(1, 0) };
    simulation.enqueue(command); const snapshot = simulation.step().observation; const hash = simulation.debugHash();
    expect(Reflect.set(snapshot.entities[0]?.current ?? {}, 'xWorld', 999)).toBe(false);
    expect(Reflect.set(snapshot.entities, '0', {})).toBe(false); expect(simulation.debugHash()).toBe(hash);
    const oldPosition = snapshot.entities[0]?.current.xWorld; simulation.step(); expect(snapshot.entities[0]?.current.xWorld).toBe(oldPosition);
    const motion = snapshot.entities[0]; if (!motion) throw new Error('probe absent');
    expect(interpolate({ ...motion, discontinuity: true }, 0)).toEqual(motion.current);
  });
  it('validates unknown boundary input and command retry identity', () => {
    const simulation = createSimulation(config()); const ref = simulation.observe().entities[0]?.ref; if (!ref) throw new Error('probe absent');
    const command: ProbeCommand = { matchId: matchId('m'), controllerId: 'probe-player', sequence: 1, targetTick: tick(1), actorRef: ref, kind: 'debugProbeDirection', payload: direction(1, 0) };
    expect(simulation.enqueue(null).reason).toBe('schema'); expect(simulation.enqueue({ ...command, payload: { xWorld: NaN, yWorld: 0 } }).reason).toBe('schema');
    expect(simulation.enqueue({ ...command, matchId: 'other' }).reason).toBe('wrongMatch');
    expect(simulation.enqueue({ ...command, sequence: 90, targetTick: 91 }).reason).toBe('futureTick');
    expect(simulation.enqueue(command).outcome).toBe('queued'); expect(simulation.enqueue(command).outcome).toBe('queued');
    expect(simulation.enqueue({ ...command, payload: direction(0, 1) }).reason).toBe('sequenceConflict');
    simulation.step(); expect(simulation.enqueue(command).outcome).toBe('accepted');
    expect(simulation.enqueue({ ...command, sequence: 2 }).reason).toBe('staleTick');
  });
  it('B enabled or disabled cannot alter any authoritative hash, with one-step prediction bound', () => {
    const on = createSimulation(config()), off = createSimulation(config()); const proxy = new VisualProxy();
    const ref = on.observe().entities[0]?.ref; if (!ref) throw new Error('probe absent');
    const command: ProbeCommand = { matchId: matchId('m'), controllerId: 'probe-player', sequence: 1, targetTick: tick(1), actorRef: ref, kind: 'debugProbeDirection', payload: direction(1, 0) };
    on.enqueue(command); off.enqueue(command);
    for (let n = 1; n <= 60; n++) {
      const a = on.step().observation; off.step(); const nowMs = n * 1000 / 30;
      proxy.position(a, 0.5, nowMs, direction(1, 0), true, 1000 / 30, 180);
      const visual = proxy.position(a, 0.5, nowMs + 1000, direction(1, 0), true, 1000 / 30, 180);
      expect((visual?.xWorld ?? 0) - (a.entities[0]?.current.xWorld ?? 0)).toBeLessThanOrEqual(6.000001);
      expect(on.debugHash()).toBe(off.debugHash());
    }
    proxy.clear(); expect(on.debugHash()).toBe(off.debugHash());
  });
  it('clears queued input at P1 and preserves a fresh input after the pause', () => {
    const simulation = createSimulation(config()); const ref = simulation.observe().entities[0]?.ref; if (!ref) throw new Error('probe absent');
    const command: ProbeCommand = { matchId: matchId('m'), controllerId: 'probe-player', sequence: 1, targetTick: tick(1), actorRef: ref, kind: 'debugProbeDirection', payload: direction(1, 0) };
    simulation.enqueue(command); simulation.neutralizeInput(); simulation.enqueue({ ...command, sequence: 2, payload: direction(0, 1) });
    const output = simulation.step(); expect(output.commandResults.map(item => item.reason)).toEqual(['inputCleared', null]);
    expect(output.observation.entities[0]?.current).toEqual({ xWorld: 0, yWorld: 6 });
  });
  it('VisualProxy measures same-Tick prediction error without counting ordinary travel as error', () => {
    const simulation = createSimulation(config()), proxy = new VisualProxy(); const first = simulation.observe(); const ref = first.entities[0]?.ref;
    if (!ref) throw new Error('probe absent');
    proxy.position(first, 0, 0, direction(1, 0), true, 1000 / 30, 180);
    simulation.enqueue({ matchId: matchId('m'), controllerId: 'probe-player', sequence: 1, targetTick: tick(1), actorRef: ref, kind: 'debugProbeDirection', payload: direction(1, 0) });
    proxy.position(simulation.step().observation, 0, 1000 / 30, direction(1, 0), true, 1000 / 30, 180);
    expect(proxy.reconciled).toBe(true); expect(proxy.correctionWorld).toBe(0);
    simulation.neutralizeInput(); proxy.position(simulation.step().observation, 0, 2000 / 30, direction(0, 0), true, 1000 / 30, 180);
    expect(proxy.correctionWorld).toBe(6); proxy.clear(); expect(proxy.reconciled).toBe(false);
  });
});

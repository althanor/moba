import { describe, expect, it } from 'vitest';
import { direction, matchId, sessionId, tick } from '../../src/foundation/index';
import type { ProbeCommand, ShellConfig } from '../../src/contracts/index';
import { FixedTick } from '../../src/application/index';
import { createSimulation } from '../../src/simulation/index';
function replay(renderFps: number, rate: number): { hashes: string[]; position: unknown } {
  const config: ShellConfig = { sessionId: sessionId('fixed'), matchId: matchId('fixed'), tickRate: rate, mode: 'response-probe', probeSpeedWorldPerSecond: 180 };
  const simulation = createSimulation(config); const ref = simulation.observe().entities[0]?.ref; if (!ref) throw new Error('probe absent');
  for (const [index, [targetTick, x, y]] of [[1, 1, 0], [16, 0, 1], [31, -1, 0], [46, 0, 0]].entries()) {
    if (targetTick === undefined || x === undefined || y === undefined) throw new Error('fixture invalid');
    const command: ProbeCommand = { matchId: config.matchId, controllerId: 'probe-player', sequence: index + 1, targetTick: tick(targetTick), actorRef: ref, kind: 'debugProbeDirection', payload: direction(x, y) };
    simulation.enqueue(command);
  }
  const clock = new FixedTick(rate); const hashes: string[] = []; clock.pulse(0, () => true);
  for (let n = 1; n <= renderFps * 2; n++) { const result = clock.pulse(n * 1000 / renderFps, () => { simulation.step(); hashes.push(simulation.debugHash()); return true; }); expect(result.overload).toBe(false); }
  return { hashes, position: simulation.observe().entities[0]?.current };
}
describe('same-rate accepted command stream replay', () => {
  for (const rate of [15, 30, 60]) it(`${rate} Hz authority is invariant under 30/60/120 FPS rendering`, () => {
    expect(replay(30, rate)).toEqual(replay(60, rate)); expect(replay(120, rate)).toEqual(replay(60, rate));
    expect(replay(60, rate).hashes).toHaveLength(rate * 2);
  });
  it('30 Hz response fixture has the hand-calculated turn result', () => { expect(replay(60, 30).position).toEqual({ xWorld: 0, yWorld: 90 }); });
});

import { describe, expect, it } from 'vitest';
import { direction, matchId, sessionId } from '../../src/foundation/index';
import type { ShellConfig } from '../../src/contracts/index';
import { Session } from '../../src/application/index';
import { createSimulation } from '../../src/simulation/index';
function makeSession(id = 'first', clear = (): void => {}): Session {
  const config: ShellConfig = { sessionId: sessionId(id), matchId: matchId(id), tickRate: 30, mode: 'response-probe', probeSpeedWorldPerSecond: 180 };
  return new Session(config, createSimulation(config), { clearInput: clear, beforeTick: () => {}, completedTick: () => {} });
}
describe('Session ownership and lifecycle', () => {
  it('creates, pauses, explicitly resumes, disposes idempotently and creates a fresh session', () => {
    let clears = 0; const session = makeSession('first', () => { clears++; }); expect(session.state).toBe('loading'); session.start();
    session.frame(0); session.command(direction(1, 0)); session.frame(1000 / 30); expect(session.observation.tick).toBe(1);
    session.pause('user'); session.pause('hidden'); session.releaseReason('user'); expect(session.resume()).toBe(false);
    session.releaseReason('hidden'); expect(session.state).toBe('paused'); expect(session.resume()).toBe(true);
    session.frame(100000); expect(session.observation.tick).toBe(1); session.frame(100000 + 1000 / 30); expect(session.observation.tick).toBe(2);
    expect(session.observation.entities[0]?.current.xWorld).toBe(6); session.dispose(); session.dispose(); session.frame(200000);
    expect(session.state).toBe('disposed'); expect(session.observation.entities).toEqual([]); expect(clears).toBeGreaterThanOrEqual(3);
    const next = makeSession('next'); next.start(); expect(next.observation.tick).toBe(0); expect(next.observation.sessionId).not.toBe(session.observation.sessionId);
  });
  it('single-steps only under user pause; hidden/fault cannot be stepped or resumed by clearing user', () => {
    const session = makeSession(); session.start(); session.pause('user'); expect(session.singleStep()).toBe(true); expect(session.observation.tick).toBe(1);
    session.pause('hidden'); expect(session.singleStep()).toBe(false); session.releaseReason('user'); expect(session.resume()).toBe(false);
  });
  it('foreground overload freezes and requires explicit resume', () => {
    const session = makeSession(); session.start(); session.frame(0); session.frame(200); expect(session.state).toBe('paused');
    expect(session.observation.tick).toBe(4); expect(session.debug().pauseReasons).toContain('overload');
    session.frame(500); expect(session.observation.tick).toBe(4);
  });
  it('20 independent reopen cycles retain no state or subscriptions in the core', () => {
    for (let i = 0; i < 20; i++) { const session = makeSession(`s-${i}`); session.start(); session.frame(0); session.frame(34); session.dispose(); expect(session.observation.entities).toHaveLength(0); }
  });
  it('fault cannot be resumed without a compatible checkpoint; M1 only supports a new Session', () => {
    const session = makeSession(); session.start(); session.pause('fault'); session.releaseReason('fault'); expect(session.resume()).toBe(false);
    session.end(); expect(session.state).toBe('ended'); expect(session.command(direction(1, 0))).toBeNull(); session.dispose();
  });
  it('end/dispose requests during a Tick complete the current boundary first', () => {
    const config: ShellConfig = { sessionId: sessionId('barrier'), matchId: matchId('barrier'), tickRate: 30, mode: 'empty', probeSpeedWorldPerSecond: 180 };
    for (const action of ['end', 'dispose'] as const) {
      const session = new Session(config, createSimulation(config), { clearInput: () => {}, beforeTick: () => {}, completedTick: () => session[action]() });
      session.start(); session.frame(0); session.frame(34); expect(session.observation.tick).toBe(1); expect(session.state).toBe(action === 'end' ? 'ended' : 'disposed');
    }
  });
});

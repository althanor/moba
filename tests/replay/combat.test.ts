import { expect, it } from 'vitest';
import { createHeadlessCombatSession } from '../../src/application/index';
import { matchId, sessionId } from '../../src/foundation/index';
import { profile, rawFixture } from '../fixtures/m2';
import { harness } from '../fixtures/m2';

it('replays the same seeded command stream across 30/60/120 Rendering pulses', () => {
  const replay = (fps: number): string[] => {
    const app = createHeadlessCombatSession(rawFixture(), { matchId: matchId('replay'), sessionId: sessionId('replay'), tickRate: 30, seed: 459, profile: profile(), roster: [{ level: 1, base: {} }] });
    const actorRef = app.debug.boundary().entities[0]?.ref;
    for (let n = 1; n <= 30; n++) app.submit({ matchId: matchId('replay'), kind: 'debugEffect', controllerId: 'fixture', sequence: n, targetTick: n, actorRef, targets: [actorRef], producer: 'fixture', effect: n % 2 ? 'damage_all' : 'heal_all' });
    app.session.start(); const hashes: string[] = []; let observed = 0;
    for (let frame = 0; frame <= fps; frame++) { app.session.frame(frame * 1000 / fps); if (app.debug.boundary().tick !== observed) { observed = app.debug.boundary().tick; hashes.push(app.debug.boundary().hash); } }
    expect(observed).toBe(30); app.session.dispose(); return hashes;
  };
  expect(replay(30)).toEqual(replay(60)); expect(replay(60)).toEqual(replay(120));
});
it('debug archive retention and attribute caching do not change authoritative replay/hash', () => {
  const full = harness(129), summary = harness(129, rawFixture(), 'summary');
  for (const h of [full, summary]) { h.submit('apply_derive', 1); h.simulation.step(); h.submit('heal_all', 2); h.simulation.step(); }
  expect(summary.debug.boundary().hash).toBe(full.debug.boundary().hash);
  expect(summary.debug.boundary().entities).toEqual(full.debug.boundary().entities);
  expect(summary.debug.boundary().factDelivery.counts).toEqual(full.debug.boundary().factDelivery.counts);
  expect(summary.debug.boundary().factDelivery.produced).toBe(full.debug.boundary().facts.length);
});

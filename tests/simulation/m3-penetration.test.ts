import { expect, it } from 'vitest';
import { circleTOI, movementCircleTOI, movementRectTOI, distance } from '../../src/foundation/index';
import { FixedTick } from '../../src/application/index';
import { battleHarness, battleRaw } from '../fixtures/m3';
it('movement circle penetration permits increasing separation, coincidence and tangent; deeper entry blocks; projectile overlap stays t=0', () => {
    const center = { xWorld: 0, yWorld: 0 }, from = { xWorld: -12, yWorld: 0 };
    expect(movementCircleTOI(from, { xWorld: -18, yWorld: 0 }, center, 24)).toBeNull();
    expect(movementCircleTOI(from, { xWorld: -6, yWorld: 0 }, center, 24)).toBe(0);
    expect(movementCircleTOI(from, { xWorld: 36, yWorld: 0 }, center, 24)).toBe(0);
    expect(movementCircleTOI(from, { xWorld: -12, yWorld: 6 }, center, 24)).toBeNull();
    expect(movementCircleTOI(center, { xWorld: 6, yWorld: 0 }, center, 24)).toBeNull();
    expect(circleTOI(from, { xWorld: -18, yWorld: 0 }, center, 24)).toBe(0);
    expect(circleTOI(center, { xWorld: 6, yWorld: 0 }, center, 24)).toBe(0);
    for (const to of [{ xWorld: -30, yWorld: 0 }, { xWorld: -24, yWorld: 6 }]) expect(movementCircleTOI({ xWorld: -24, yWorld: 0 }, to, center, 24)).toBeNull();
});
it('rectangle penetration selects all tied nearest faces, rejects deeper movement, and preserves touching-away/tangent sweeps', () => {
    const r = { minX: -10, maxX: 10, minY: -70, maxY: 70 };
    expect(movementRectTOI({ xWorld: 0, yWorld: 0 }, { xWorld: -6, yWorld: 0 }, r, 12)).toBeNull();
    expect(movementRectTOI({ xWorld: 0, yWorld: 0 }, { xWorld: 6, yWorld: 0 }, r, 12)).toBeNull();
    expect(movementRectTOI({ xWorld: -4, yWorld: 0 }, { xWorld: 2, yWorld: 0 }, r, 12)).toBe(0);
    expect(movementRectTOI({ xWorld: -4, yWorld: 0 }, { xWorld: 30, yWorld: 0 }, r, 12)).toBe(0);
    expect(movementRectTOI({ xWorld: -4, yWorld: 0 }, { xWorld: -10, yWorld: 0 }, r, 12)).toBeNull();
    expect(movementRectTOI({ xWorld: -18, yWorld: 0 }, { xWorld: -18, yWorld: 6 }, r, 12)).toBe(0);
    for (const to of [{ xWorld: -28, yWorld: 0 }, { xWorld: -22, yWorld: 6 }]) expect(movementRectTOI({ xWorld: -22, yWorld: 0 }, to, r, 12)).toBeNull();
    expect(movementRectTOI({ xWorld: -22, yWorld: 0 }, { xWorld: -16, yWorld: 0 }, r, 12)).toBe(0);
});
it('rectangle recovery accepted segments never deepen signed penetration: interior, edge, rounded corner and tied faces oracle', () => {
    const r = { minX: -10, maxX: 10, minY: -10, maxY: 10 };
    const signed = (x: number, y: number) => x >= -10 && x <= 10 && y >= -10 && y <= 10 ? -Math.min(x + 10, 10 - x, y + 10, 10 - y) : Math.hypot(Math.max(Math.abs(x) - 10, 0), Math.max(Math.abs(y) - 10, 0));
    for (const [x, y] of [[0, 0], [-4, 0], [-9, -9], [-15, 0], [-15, -15], [10, 0]]) for (let angle = 0; angle < 32; angle++) {
        if (x === undefined || y === undefined) throw new Error('point');
        const dx = 30 * Math.cos(angle * Math.PI / 16), dy = 30 * Math.sin(angle * Math.PI / 16);
        if (movementRectTOI({ xWorld: x, yWorld: y }, { xWorld: x + dx, yWorld: y + dy }, r, 12) !== null) continue;
        let last = signed(x, y); for (let step = 1; step <= 100; step++) { const next = signed(x + dx * step / 100, y + dy * step / 100); expect(next).toBeGreaterThanOrEqual(last - 1e-8); last = next; }
        expect(last).toBeGreaterThan(signed(x, y));
    }
});
function overlapping() {
    const raw = battleRaw(); raw.gameplay.spawns[0] = { xWorld: -100, yWorld: 0, team: 0, controller: 'player' }; raw.gameplay.spawns[1] = { xWorld: -100, yWorld: 0, team: 1, controller: 'target' }; return raw;
}
it('legal coincident spawns both move outward in stable order; offset overlap blocks inward but permits outward and tangent', () => {
    const h = battleHarness(overlapping()); h.command('move', null, undefined, null, h.refs[0], 1, { xWorld: -1, yWorld: 0 }); h.command('move', null, undefined, null, h.refs[1], 1, { xWorld: 1, yWorld: 0 }); h.step(5);
    const units = h.simulation.observe().battle?.units; expect(units?.[0]?.position.xWorld).toBe(-130); expect(units?.[1]?.position.xWorld).toBe(-70);
    for (const d of [{ xWorld: 1, yWorld: 0 }, { xWorld: -1, yWorld: 0 }, { xWorld: 0, yWorld: -1 }]) {
        const raw = overlapping(); raw.gameplay.spawns[1] = { xWorld: -88, yWorld: 0, team: 1, controller: 'target' }; const x = battleHarness(raw); x.command('move', null, undefined, null, x.refs[0], 1, d); x.step();
        expect(x.simulation.observe().battle?.units[0]?.position).toEqual(d.xWorld === 1 ? { xWorld: -100, yWorld: 0 } : { xWorld: -100 + 6 * d.xWorld, yWorld: 6 * d.yWorld });
    }
});
function displacement(mode: string, wall: string, units: string, distanceWorld: number) {
    const raw = battleRaw(); raw.gameplay.spawns[0] = { xWorld: -100, yWorld: 0, team: 0, controller: 'player' }; raw.gameplay.spawns[1] = { xWorld: 200, yWorld: 0, team: 1, controller: 'target' };
    return { ...raw, effects: raw.effects.map(e => e.id === 'dash' ? { ...e, node: { kind: 'displace', mode, wall, units, distanceWorld, speedWorldPerSecond: 600 } } : e) };
}
it.each(['direct', 'teleport', 'dash', 'forced'])('%s units:ignore permits an overlapping endpoint, then ordinary stop movement recovers', mode => {
    const raw = displacement(mode, 'stop', 'ignore', 75); raw.gameplay.spawns[1] = { xWorld: -25, yWorld: -100, team: 1, controller: 'target' }; raw.gameplay.spawns[0] = { xWorld: -100, yWorld: -100, team: 0, controller: 'player' };
    const h = battleHarness(raw); h.command('cast', 'dash', { xWorld: 200, yWorld: -100 }, null); h.step(8); expect(h.simulation.observe().battle?.units[0]?.position).toEqual(h.simulation.observe().battle?.units[1]?.position);
    h.command('move', null, undefined, null, h.refs[0], 9, { xWorld: 0, yWorld: -1 }); h.step(5); expect(h.simulation.observe().battle?.units[0]?.position.yWorld).toBe(-130); expect(h.debug.fault()).toBeNull();
});
it.each(['direct', 'teleport', 'dash', 'forced'])('%s wall:ignore permits an obstacle endpoint, then ordinary movement recovers and new entries still collide', mode => {
    const h = battleHarness(displacement(mode, 'ignore', 'stop', 100)); h.command('cast', 'dash', { xWorld: 200, yWorld: 0 }, null); h.step(8); expect(h.simulation.observe().battle?.units[0]?.position.xWorld).toBe(0);
    h.command('move', null, undefined, null, h.refs[0], 9, { xWorld: 1, yWorld: 0 }); h.step(5); expect(h.simulation.observe().battle?.units[0]?.position.xWorld).toBe(30);
    h.command('move', null, undefined, null, h.refs[0], 14, { xWorld: -1, yWorld: 0 }); h.step(3); expect(h.simulation.observe().battle?.units[0]?.position.xWorld).toBe(22); expect(h.debug.fault()).toBeNull();
});
it('arena is never ignored: clamp preserves touching tangent/inward motion and blocks outward motion', () => {
    const raw = displacement('teleport', 'ignore', 'ignore', 1000); raw.gameplay.spawns[0] = { xWorld: 400, yWorld: 0, team: 0, controller: 'player' }; const h = battleHarness(raw);
    h.command('cast', 'dash', { xWorld: 1000, yWorld: 0 }, null); h.step(8); expect(h.simulation.observe().battle?.units[0]?.position.xWorld).toBe(468);
    h.command('move', null, undefined, null, h.refs[0], 9, { xWorld: 1, yWorld: 0 }); h.step(); expect(h.simulation.observe().battle?.units[0]?.position.xWorld).toBe(468);
    h.command('move', null, undefined, null, h.refs[0], 10, { xWorld: 0, yWorld: -1 }); h.step(); expect(h.simulation.observe().battle?.units[0]?.position).toEqual({ xWorld: 468, yWorld: -6 });
    h.command('move', null, undefined, null, h.refs[0], 11, { xWorld: -1, yWorld: 0 }); h.step(); expect(h.simulation.observe().battle?.units[0]?.position.xWorld).toBe(462);
});
it('Simulation projectile spawned overlapping a target hits at t=0 once and expiry never repeats it', () => {
    const raw = overlapping(); raw.gameplay.spawns[1] = { xWorld: -90, yWorld: 0, team: 1, controller: 'target' }; const h = battleHarness(raw); h.command('cast', 'bolt', { xWorld: 300, yWorld: 0 }, null); h.step(4);
    expect(h.simulation.observe().battle?.units[1]?.health).toBe(920); let hits = h.debug.boundary().factDelivery.counts.find(f => f.kind === 'DamageResolved')?.count ?? 0;
    for (let tick = 0; tick < 35; tick++) { h.step(); hits += h.debug.boundary().factDelivery.counts.find(f => f.kind === 'DamageResolved')?.count ?? 0; }
    expect(h.simulation.observe().battle?.units[1]?.health).toBe(920); expect(h.simulation.observe().battle?.projectiles).toHaveLength(0); expect(hits).toBe(1);
});
it('overlap recovery, ignore endpoints and new-entry collision replay identically at 15/30/60/120 rendering FPS', () => {
    const replay = (fps: number) => {
        const raw = displacement('teleport', 'ignore', 'ignore', 100); raw.gameplay.spawns[1] = { xWorld: -100, yWorld: 0, team: 1, controller: 'target' }; const h = battleHarness(raw);
        h.command('cast', 'dash', { xWorld: 200, yWorld: 0 }, null, h.refs[0], 1); h.command('move', null, undefined, null, h.refs[1], 1, { xWorld: -1, yWorld: 0 }); h.command('move', null, undefined, null, h.refs[0], 9, { xWorld: 1, yWorld: 0 }); h.command('move', null, undefined, null, h.refs[0], 20, { xWorld: -1, yWorld: 0 });
        const clock = new FixedTick(30), hashes: string[] = []; clock.pulse(0, () => true); for (let frame = 1; frame <= 2 * fps; frame++) expect(clock.pulse(frame * 1000 / fps, () => { h.step(); hashes.push(h.simulation.debugHash()); return true; }).overload).toBe(false);
        const units = h.simulation.observe().battle?.units; expect(units?.[0]?.position.xWorld).toBe(22); expect(units?.[1]?.position.xWorld).toBeLessThan(-124); expect(hashes).toHaveLength(60); expect(distance(units?.[0]?.position ?? { xWorld: 0, yWorld: 0 }, units?.[1]?.position ?? { xWorld: 0, yWorld: 0 })).toBeGreaterThan(24);
        return { hashes, units, delivery: h.debug.boundary().factDelivery };
    };
    const baseline = replay(60); for (const fps of [15, 30, 120]) expect(replay(fps)).toEqual(baseline);
});

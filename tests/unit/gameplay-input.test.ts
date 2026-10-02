import { expect, it } from 'vitest';
import { GameplayController } from '../../src/controllers/index';
import { distance, touchLayout } from '../../src/foundation/index';
import type { Vec2 } from '../../src/foundation/index';
import type { RawInput } from '../../src/contracts/index';
import { battleHarness } from '../fixtures/m3';
const view = battleHarness().simulation.observe().battle;
if (!view) throw new Error('battle view');
const arena = view.arena;
const sample = (pointerId: number, phase: RawInput['phase'], x: number, y: number): RawInput => ({ pointerId, phase, screenCssX: x, screenCssY: y, sampleId: 1, capturedAtMs: 0 });
const render = (v: Vec2, w: number, h: number) => ({ x: v.xWorld * w / (arena.maxX - arena.minX), y: v.yWorld * h / (arena.maxY - arena.minY) });
function collinear(v: Vec2, dx: number, dy: number, w: number, h: number) {
    const p = render(v, w, h);
    expect(p.x * dy - p.y * dx).toBeCloseTo(0, 9);
    expect(p.x * dx + p.y * dy).toBeGreaterThan(0);
}
for (const [w, h] of [[960, 480], [960, 540], [1503, 536]] as const) {
    it(`CSS/world input at ${w}x${h}: H/V/45-degree movement preserves screen angle and analog magnitude`, () => {
        for (const [dx, dy] of [[24, 0], [0, -24], [24 / Math.SQRT2, -24 / Math.SQRT2], [96 / Math.SQRT2, -96 / Math.SQRT2]]) {
            if (dx === undefined || dy === undefined) throw new Error('vector');
            const c = new GameplayController(); c.sample(sample(1, 'begin', 64, h - 64), w, h, view);
            c.sample(sample(1, 'move', 64 + dx, h - 64 + dy), w, h, view);
            expect(Math.hypot(c.intent.direction.xWorld, c.intent.direction.yWorld)).toBeCloseTo(Math.min(1, Math.hypot(dx, dy) / 48));
            collinear(c.intent.direction, dx, dy, w, h);
            const actual = battleHarness(); actual.command('move', null, undefined, null, actual.refs[0], 1, c.intent.direction); actual.step();
            const u = actual.simulation.observe().battle?.units[0]; if (!u) throw new Error('unit');
            collinear({ xWorld: u.position.xWorld - u.previous.xWorld, yWorld: u.position.yWorld - u.previous.yWorld }, dx, dy, w, h);
            c.sample(sample(1, 'end', 64 + dx, h - 64 + dy), w, h, view); expect(c.intent.direction).toEqual({ xWorld: 0, yWorld: 0 });
        }
    });
    it(`CSS/world input at ${w}x${h}: direction/point preview and released aim render along H/V/45-degree finger vectors`, () => {
        for (const id of ['bolt', 'field', 'dash']) for (const [dx, dy] of [[24, 0], [0, -24], [24, -24]]) {
            if (dx === undefined || dy === undefined) throw new Error('vector');
            const i = view.actions.findIndex(a => a.id === id), b = touchLayout(w, h, 6).buttons[i]; if (!b) throw new Error('button');
            const c = new GameplayController(); c.sample(sample(2, 'begin', b.xCss, b.yCss), w, h, view); c.sample(sample(2, 'move', b.xCss + dx, b.yCss + dy), w, h, view);
            const p = c.preview?.point, actor = view.units[0]; if (!p || !actor) throw new Error('preview');
            collinear({ xWorld: p.xWorld - actor.position.xWorld, yWorld: p.yWorld - actor.position.yWorld }, dx, dy, w, h);
            expect(distance(p, actor.position)).toBeCloseTo(view.actions[i]?.rangeWorld ?? 0);
            c.sample(sample(2, 'end', b.xCss + dx, b.yCss + dy), w, h, view); expect(c.consume()[0]?.payload.point).toEqual(p);
        }
    });
    it(`CSS/world input at ${w}x${h}: target tap retains independent axis mapping and simultaneous move/aim remains independent`, () => {
        const c = new GameplayController(), target = view.units[2]; if (!target) throw new Error('target');
        const x = (target.position.xWorld - arena.minX) * w / (arena.maxX - arena.minX), y = (target.position.yWorld - arena.minY) * h / (arena.maxY - arena.minY);
        c.sample(sample(3, 'begin', x, y), w, h, view); c.sample(sample(3, 'end', x, y), w, h, view);
        const tap = c.consume()[0]; expect(tap?.kind).toBe('targetLock'); expect(tap?.payload.target).toEqual(target.ref); expect(tap?.payload.point.xWorld).toBeCloseTo(target.position.xWorld); expect(tap?.payload.point.yWorld).toBeCloseTo(target.position.yWorld);
        const b = touchLayout(w, h, 6).buttons[1]; if (!b) throw new Error('button');
        c.sample(sample(1, 'begin', 64, h - 64), w, h, view); c.sample(sample(2, 'begin', b.xCss, b.yCss), w, h, view);
        c.sample(sample(1, 'move', 88, h - 88), w, h, view); const move = c.intent.direction;
        c.sample(sample(2, 'move', b.xCss - 24, b.yCss - 24), w, h, view); const aim = c.preview?.point;
        const actor = view.units[0]; if (!actor) throw new Error('actor');
        const moved = { ...view, units: view.units.map(u => u === actor ? { ...u, position: { xWorld: u.position.xWorld + 6, yWorld: u.position.yWorld - 3 } } : u) };
        const rebased = c.previewFor(moved)?.point; if (!rebased) throw new Error('rebased preview');
        collinear({ xWorld: rebased.xWorld - actor.position.xWorld - 6, yWorld: rebased.yWorld - actor.position.yWorld + 3 }, -24, -24, w, h);
        expect(c.intent.direction).toEqual(move); c.sample(sample(2, 'end', b.xCss - 24, b.yCss - 24), w, h, view);
        expect(c.consume().map(r => r.kind)).toEqual(['move', 'cast']); expect(c.intent.direction).toEqual(move); expect(aim).toBeDefined();
        c.sample(sample(1, 'cancel', 88, h - 88), w, h, view); expect(c.consume()[0]?.payload.direction).toEqual({ xWorld: 0, yWorld: 0 });
    });
}

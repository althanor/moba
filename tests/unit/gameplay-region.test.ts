import { expect, it } from 'vitest';
import { GameplayController } from '../../src/controllers/index';
import { Session } from '../../src/application/index';
import { touchLayout } from '../../src/foundation/index';
import type { CommandResult, RawInput } from '../../src/contracts/index';
import { battleHarness } from '../fixtures/m3';

function fixture(width: number, height: number) {
    const h = battleHarness(), controller = new GameplayController();
    const queued: CommandResult[] = [], accepted: CommandResult[] = [];
    const session = new Session({ ...h.config, mode: 'empty', probeSpeedWorldPerSecond: 0 }, h.simulation, {
        clearInput: () => controller.clear(),
        beforeTick: s => { for (const request of controller.consume()) { const r = s.submit(request); if (r) queued.push(r); } },
        completedTick: output => accepted.push(...output.commandResults)
    });
    session.start(); session.frame(0); let sequence = 0, now = 0;
    const view = () => { const v = session.observation.battle; if (!v) throw new Error('battle'); return v; };
    const layout = touchLayout(width, height, view().actions.length), a = layout.buttons[0], b = layout.buttons[1];
    if (!a || !b || !layout.skillControl) throw new Error('layout');
    const gap = { xCss: (a.xCss + b.xCss) / 2, yCss: a.yCss };
    expect(layout.buttons.every(button => Math.hypot(gap.xCss - button.xCss, gap.yCss - button.yCss) > button.radiusCss)).toBe(true);
    expect(gap.xCss).toBeGreaterThan(layout.skillControl.minXCss); expect(gap.xCss).toBeLessThan(layout.skillControl.maxXCss);
    expect(gap.yCss).toBeGreaterThan(layout.skillControl.minYCss); expect(gap.yCss).toBeLessThan(layout.skillControl.maxYCss);
    const sample = (pointerId: number, phase: RawInput['phase'], point = gap) => controller.sample({ pointerId, phase, screenCssX: point.xCss, screenCssY: point.yCss, sampleId: ++sequence, capturedAtMs: now }, width, height, view());
    const tick = () => session.frame(now += 34);
    return { h, controller, session, queued, accepted, view, layout, gap, sample, tick, width, height };
}

for (const [width, height] of [[960, 480], [960, 540], [1503, 536]] as const) {
    it(`skill-control ${width}x${height}: gap begin/move/end/cancel is ignored, has no held target or authority mutation`, () => {
        const f = fixture(width, height), hash = f.h.simulation.debugHash();
        const battlefield = { xCss: width * .6, yCss: height * .3 };
        for (const terminal of ['end', 'cancel'] as const) {
            expect(f.sample(10, 'begin')).toBe('ignored');
            expect(f.sample(10, 'move')).toBe('ignored');
            // Moving out of the UI cannot adopt a role without a fresh begin.
            expect(f.sample(10, 'move', battlefield)).toBe('ignored');
            expect(f.sample(10, terminal, battlefield)).toBe('ignored');
            expect(f.sample(10, 'end', battlefield)).toBe('ignored');
            expect(f.controller.consume()).toEqual([]);
            expect(f.controller.preview).toBeNull();
        }
        expect(f.h.simulation.debugHash()).toBe(hash); f.tick();
        expect(f.queued).toEqual([]); expect(f.accepted).toEqual([]); expect(f.view().units[0]?.lock).toBeNull();
        expect(f.sample(10, 'move', battlefield)).toBe('ignored'); // no held residue
        f.session.dispose();
    });
    it(`skill-control ${width}x${height}: battlefield tap queues/accepts the correct target and later gap preserves its lock`, () => {
        const f = fixture(width, height), target = f.view().units[2]; if (!target) throw new Error('target');
        const arena = f.view().arena, point = { xCss: (target.position.xWorld - arena.minX) * width / (arena.maxX - arena.minX), yCss: (target.position.yWorld - arena.minY) * height / (arena.maxY - arena.minY) };
        expect(point.yCss).toBeLessThan(f.layout.skillControl?.minYCss ?? 0);
        expect(f.sample(1, 'begin', point)).toBe('target'); expect(f.sample(1, 'end', point)).toBe('target'); f.tick();
        expect(f.queued.map(r => r.outcome)).toEqual(['queued']); expect(f.accepted.map(r => r.outcome)).toEqual(['accepted']);
        expect(f.view().units[0]?.lock).toEqual(target.ref);
        expect(f.sample(2, 'begin')).toBe('ignored'); expect(f.sample(2, 'move')).toBe('ignored'); expect(f.sample(2, 'end')).toBe('ignored'); f.tick();
        expect(f.queued).toHaveLength(1); expect(f.accepted).toHaveLength(1); expect(f.view().units[0]?.lock).toEqual(target.ref);
        f.session.dispose();
    });
    it(`skill-control ${width}x${height}: all six centers remain skill inputs; joystick/cancel roles and UI-free target space stay distinct`, () => {
        const f = fixture(width, height);
        for (const [index, button] of f.layout.buttons.entries()) {
            const action = f.view().actions[index]; if (!action) throw new Error('action');
            expect(f.sample(3, 'begin', button)).toBe(`skill:${action.id}`);
            expect(f.sample(3, 'end', button)).toBe(`skill:${action.id}`);
            expect(f.controller.consume().map(r => [r.kind, r.payload.action])).toEqual([['cast', action.id]]);
            expect(f.sample(3, 'move', button)).toBe('ignored');
        }
        expect(f.sample(4, 'begin', f.layout.joystick)).toBe('joystick');
        expect(f.sample(5, 'begin')).toBe('ignored'); expect(f.sample(5, 'end')).toBe('ignored');
        expect(f.sample(4, 'move', { xCss: f.layout.joystick.xCss, yCss: f.layout.joystick.yCss - 24 })).toBe('joystick');
        expect(f.controller.consume().map(r => r.kind)).toEqual(['move']); expect(f.controller.intent.direction.yWorld).toBeLessThan(0);
        expect(f.sample(4, 'cancel', f.layout.joystick)).toBe('joystick'); f.controller.consume();
        expect(f.sample(6, 'begin', f.layout.cancel)).toBe('cancel'); expect(f.sample(6, 'end', f.layout.cancel)).toBe('cancel');
        expect(f.controller.consume().map(r => r.kind)).toEqual(['cancelAction']);
        // Immediately outside each finite envelope edge remains battlefield.
        const r = f.layout.skillControl; if (!r) throw new Error('region');
        for (const p of [{ xCss: r.minXCss - 1, yCss: f.gap.yCss }, { xCss: r.maxXCss + 1, yCss: f.gap.yCss }, { xCss: f.gap.xCss, yCss: r.minYCss - 1 }, { xCss: f.gap.xCss, yCss: r.maxYCss + 1 }]) {
            expect(f.sample(7, 'begin', p)).toBe('target'); expect(f.sample(7, 'cancel', p)).toBe('target'); expect(f.controller.consume()).toEqual([]);
        }
        f.session.dispose();
    });
}
it('skill-control geometry is layout-derived and finite; zero buttons reserve no surface; Android reported point is a genuine gap', () => {
    expect(touchLayout(960, 540, 0).skillControl).toBeNull();
    const layout = touchLayout(1503, 536, 6), point = { xCss: 1444.63, yCss: 466.04 }, r = layout.skillControl;
    if (!r) throw new Error('region');
    expect(r).toEqual({ minXCss: 1294, maxXCss: 1492, minYCss: 395, maxYCss: 523 });
    expect(layout.buttons.every(b => Math.hypot(point.xCss - b.xCss, point.yCss - b.yCss) > b.radiusCss)).toBe(true);
    const f = fixture(1503, 536); for (const phase of ['begin', 'move', 'end', 'cancel'] as const) expect(f.sample(99, phase, point)).toBe('ignored');
    expect(f.controller.consume()).toEqual([]); f.tick(); expect(f.view().units[0]?.lock).toBeNull(); f.session.dispose();
});

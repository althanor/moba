import { direction, distance, touchLayout, unit, subtract, cssPointToWorld, cssVectorToWorld } from '../../foundation/index';
import type { Vec2 } from '../../foundation/index';
import type { ActionDef, BattleView, EntityRef, GameplayCommand, RawInput } from '../../contracts/index';
export interface GameplayRequest {
    readonly kind: GameplayCommand['kind'];
    readonly payload: GameplayCommand['payload'];
    readonly sampleId: number;
}
interface Held {
    origin: Vec2;
    role: 'joystick' | 'skill' | 'target' | 'cancel';
    action: ActionDef | null;
    point: Vec2;
    sampleId: number;
}
export class GameplayController {
    readonly #held = new Map<number, Held>();
    #requests: GameplayRequest[] = [];
    #move: GameplayRequest | null = null;
    #direction: Vec2 = { xWorld: 0, yWorld: 0 };
    #sampleId: number | null = null;
    #preview: {
        action: ActionDef;
        point: Vec2;
        cancel: boolean;
        sampleId: number;
    } | null = null;
    #previewOffset: Vec2 | null = null;
    get intent() { return { direction: this.#direction, sampleId: this.#sampleId }; }
    get preview() { return this.#preview; }
    previewFor(view: BattleView) {
        const actor = view.units[0];
        if (!this.#preview || !this.#previewOffset || !actor) return this.#preview;
        return { ...this.#preview, point: { xWorld: actor.position.xWorld + this.#previewOffset.xWorld, yWorld: actor.position.yWorld + this.#previewOffset.yWorld } };
    }
    #target(view: BattleView, point: Vec2 | null, relation: ActionDef['relation']): EntityRef | null {
        const actor = view.units[0];
        if (!actor)
            return null;
        let best: typeof actor | null = null, score = Infinity;
        for (const u of view.units) {
            if (u.ref.index === actor.ref.index || !u.alive || relation === 'enemy' && u.team === actor.team || relation === 'ally' && u.team !== actor.team)
                continue;
            const d = distance(point ?? actor.position, u.position);
            if (d < score || d === score && u.ref.index < (best?.ref.index ?? Infinity)) {
                best = u;
                score = d;
            }
        }
        return best?.ref ?? null;
    }
    sample(sample: RawInput, widthCss: number, heightCss: number, view: BattleView): string {
        const p = { xWorld: sample.screenCssX, yWorld: sample.screenCssY }, layout = touchLayout(widthCss, heightCss, view.actions.length), actor = view.units[0];
        if (!actor)
            return 'unavailable';
        let held = this.#held.get(sample.pointerId);
        if (sample.phase === 'begin') {
            const button = layout.buttons.findIndex(b => Math.hypot(p.xWorld - b.xCss, p.yWorld - b.yCss) <= b.radiusCss);
            const action = button >= 0 ? view.actions[button] ?? null : null;
            const cancel = Math.hypot(p.xWorld - layout.cancel.xCss, p.yWorld - layout.cancel.yCss) <= layout.cancel.radiusCss;
            const region = layout.skillControl;
            if (!action && !cancel && region && p.xWorld >= region.minXCss && p.xWorld <= region.maxXCss && p.yWorld >= region.minYCss && p.yWorld <= region.maxYCss)
                return 'ignored'; // No held role: subsequent move/end/cancel cannot become target input.
            const role = action ? 'skill' : cancel ? 'cancel' : p.xWorld < widthCss * .5 && p.yWorld > heightCss * .55 ? 'joystick' : 'target';
            if (role === 'joystick' && [...this.#held.values()].some(h => h.role === 'joystick') || role === 'skill' && [...this.#held.values()].some(h => h.role === 'skill'))
                return 'ignored';
            held = { origin: p, point: actor.position, role, action, sampleId: sample.sampleId };
            this.#held.set(sample.pointerId, held);
        }
        if (!held)
            return 'ignored';
        held.sampleId = sample.sampleId;
        const pointWorld = cssPointToWorld({ xCss: sample.screenCssX, yCss: sample.screenCssY }, widthCss, heightCss, view.arena);
        const dragCss = { xCss: p.xWorld - held.origin.xWorld, yCss: p.yWorld - held.origin.yWorld };
        const dragLengthCss = Math.hypot(dragCss.xCss, dragCss.yCss);
        const dragWorld = cssVectorToWorld(dragCss, widthCss, heightCss, view.arena);
        const payload = (action: ActionDef | null, point: Vec2, target: EntityRef | null, d: Vec2 = { xWorld: 0, yWorld: 0 }): GameplayCommand['payload'] => ({ action: action?.id ?? null, point, target, direction: d });
        if (held.role === 'joystick') {
            const worldDirection = unit(dragWorld), magnitude = Math.min(1, dragLengthCss / layout.joystick.radiusCss);
            this.#direction = sample.phase === 'end' || sample.phase === 'cancel' ? { xWorld: 0, yWorld: 0 } : direction(worldDirection.xWorld * magnitude, worldDirection.yWorld * magnitude);
            this.#sampleId = sample.sampleId;
            this.#move = { kind: 'move', payload: payload(null, actor.position, null, this.#direction), sampleId: sample.sampleId };
        }
        else if (held.role === 'skill' && held.action) {
            const a = held.action, dragged = dragLengthCss > 8, target = this.#target(view, null, a.relation), targetPosition = view.units.find(u => u.ref.index === target?.index)?.position ?? { xWorld: actor.position.xWorld + 1, yWorld: actor.position.yWorld };
            const dir = unit(dragged ? dragWorld : subtract(targetPosition, actor.position));
            held.point = a.target === 'self' ? actor.position : { xWorld: actor.position.xWorld + dir.xWorld * Math.max(1, a.rangeWorld), yWorld: actor.position.yWorld + dir.yWorld * Math.max(1, a.rangeWorld) };
            if (a.target === 'point' && !dragged)
                held.point = targetPosition;
            const cancel = p.yWorld < heightCss * .4 && p.xWorld > widthCss * .65;
            this.#preview = { action: a, point: held.point, cancel, sampleId: sample.sampleId };
            this.#previewOffset = a.target === 'point' && !dragged ? null : subtract(held.point, actor.position);
            if (sample.phase === 'end' && !cancel)
                this.#requests.push({ kind: 'cast', payload: payload(a, held.point, a.target === 'unit' ? (actor.lock ?? this.#target(view, dragged ? held.point : null, a.relation)) : null), sampleId: sample.sampleId });
            if (sample.phase === 'end' || sample.phase === 'cancel') {
                this.#preview = null;
                this.#previewOffset = null;
            }
        }
        else if (held.role === 'cancel' && sample.phase === 'begin')
            this.#requests.push({ kind: 'cancelAction', payload: payload(null, actor.position, null), sampleId: sample.sampleId });
        else if (held.role === 'target' && sample.phase === 'end')
            this.#requests.push({ kind: 'targetLock', payload: payload(null, pointWorld, this.#target(view, pointWorld, 'enemy')), sampleId: sample.sampleId });
        if (sample.phase === 'end' || sample.phase === 'cancel')
            this.#held.delete(sample.pointerId);
        return held.role === 'skill' ? `skill:${held.action?.id}` : held.role;
    }
    consume(): readonly GameplayRequest[] { const result = this.#move ? [this.#move, ...this.#requests] : [...this.#requests]; this.#move = null; this.#requests = []; return result; }
    clear(): void { this.#held.clear(); this.#requests = []; this.#move = null; this.#direction = { xWorld: 0, yWorld: 0 }; this.#sampleId = null; this.#preview = null; this.#previewOffset = null; }
}

import { describe, expect, it } from 'vitest';
import type { RawInput } from '../../src/contracts/index';
import { ProbeController } from '../../src/controllers/index';
import { PointerTracker } from '../../src/presentation/probe';
function sample(id: number, phase: RawInput['phase'], x = 100, y = 100): RawInput {
  return { pointerId: id, sampleId: id * 10, phase, screenCssX: x, screenCssY: y, capturedAtMs: 0 };
}
describe('multi-pointer input', () => {
  it('independently samples joystick and right-side pointer', () => {
    const controller = new ProbeController(); controller.sample(sample(1, 'begin'), 960); controller.sample(sample(2, 'begin', 800), 960);
    controller.sample(sample(1, 'move', 160), 960); expect(controller.activePointers).toBe(2); expect(controller.consume()?.direction.xWorld).toBe(1);
    controller.sample(sample(2, 'cancel'), 960); expect(controller.activePointers).toBe(1); expect(controller.intent.direction.xWorld).toBe(1);
    controller.sample(sample(1, 'cancel'), 960); expect(controller.intent.direction.xWorld).toBe(0); expect(controller.activePointers).toBe(0);
  });
  it('cancel, loss of focus and overlay clear state without adopting an already held second finger', () => {
    const controller = new ProbeController(); controller.sample(sample(1, 'begin'), 960); controller.sample(sample(2, 'begin'), 960);
    controller.sample(sample(1, 'move', 160), 960); controller.clear();
    controller.sample(sample(1, 'move', 250), 960); expect(controller.intent.direction.xWorld).toBe(0); expect(controller.activePointers).toBe(0);
    expect(controller.consume()?.direction).toEqual({ xWorld: 0, yWorld: 0 }); expect(controller.consume()).toBeNull();
  });
  it('pointer tracker rejects ghost move/end and duplicate end', () => {
    const tracker = new PointerTracker(); expect(tracker.accept(sample(1, 'move'))).toBe(false);
    tracker.accept(sample(1, 'begin')); tracker.accept(sample(2, 'begin')); tracker.accept(sample(1, 'cancel'));
    expect(tracker.size).toBe(1); expect(tracker.accept(sample(1, 'end'))).toBe(false); tracker.clear(); expect(tracker.size).toBe(0);
  });
});

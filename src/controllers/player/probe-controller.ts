import { direction } from '../../foundation/index';
import type { ControllerInput, RawInput } from '../../contracts/index';
export class ProbeController {
  #pointers = new Map<number, { originCssX: number; originCssY: number; sample: RawInput }>();
  #joystickPointer: number | null = null;
  #dirty = false;
  #latestSampleId: number | null = null;
  #direction = direction(0, 0);
  sample(input: RawInput, widthCss: number): void {
    if (input.phase === 'begin') {
      this.#pointers.set(input.pointerId, { originCssX: input.screenCssX, originCssY: input.screenCssY, sample: input });
      if (this.#joystickPointer === null && input.screenCssX < widthCss / 2) this.#joystickPointer = input.pointerId;
    }
    const pointer = this.#pointers.get(input.pointerId);
    if (!pointer) return;
    pointer.sample = input;
    if (this.#joystickPointer === input.pointerId) {
      this.#direction = input.phase === 'end' || input.phase === 'cancel' ? direction(0, 0) : direction(
        (input.screenCssX - pointer.originCssX) / 60, (input.screenCssY - pointer.originCssY) / 60);
      this.#dirty = true; this.#latestSampleId = input.sampleId;
    }
    if (input.phase === 'end' || input.phase === 'cancel') {
      this.#pointers.delete(input.pointerId);
      if (this.#joystickPointer === input.pointerId) this.#joystickPointer = null;
    }
  }
  consume(): ControllerInput | null {
    if (!this.#dirty) return null;
    this.#dirty = false;
    return Object.freeze({ direction: this.#direction, sampleId: this.#latestSampleId });
  }
  get intent(): ControllerInput { return Object.freeze({ direction: this.#direction, sampleId: this.#latestSampleId }); }
  get activePointers(): number { return this.#pointers.size; }
  clear(): void {
    this.#pointers.clear(); this.#joystickPointer = null; this.#direction = direction(0, 0); this.#latestSampleId = null; this.#dirty = true;
  }
}

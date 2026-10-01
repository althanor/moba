import Phaser from 'phaser';
import type { PresentationFrame, PresentationHost, RawInput } from '../../../contracts/index';
import type { Vec2 } from '../../../foundation/index';
import { PointerTracker } from '../../input/pointer-tracker';
import { VisualProxy } from '../entities/visual-proxy';

export class ProbeScene extends Phaser.Scene {
  readonly #host: PresentationHost;
  readonly #tracker = new PointerTracker();
  readonly #proxy = new VisualProxy();
  #grid: Phaser.GameObjects.Graphics | null = null;
  #shapes: Phaser.GameObjects.Graphics | null = null;
  #feedback = new Map<number, RawInput>();
  #sampleSequence = 0;
  #lastPosition: Vec2 | null = null;
  #lastSession = '';
  #lastUIAtMs = 0;
  #disposeInput: (() => void) | null = null;
  #pendingUI = new Set<number>();
  #pendingVisual = new Set<number>();
  #frameStartedAtMs = 0;
  #lastFrameAtMs: number | null = null;
  #frameDurationMs = 0;
  constructor(host: PresentationHost) { super('M1-Probe'); this.#host = host; }
  create(): void {
    this.#grid = this.add.graphics(); this.#shapes = this.add.graphics(); this.#drawGrid();
    this.game.events.on(Phaser.Core.Events.POST_RENDER, this.#postRender, this);
    this.scale.on('resize', this.#drawGrid, this);
    const canvas = this.game.canvas;
    const handler = (phase: RawInput['phase']) => (event: PointerEvent): void => {
      event.preventDefault(); const bounds = canvas.getBoundingClientRect();
      const sample: RawInput = Object.freeze({ sampleId: ++this.#sampleSequence, pointerId: event.pointerId, phase,
        screenCssX: event.clientX - bounds.left, screenCssY: event.clientY - bounds.top, capturedAtMs: this.#host.nowMs() });
      if (!this.#tracker.accept(sample)) return;
      if (phase === 'begin') canvas.setPointerCapture(event.pointerId);
      this.#feedback.set(event.pointerId, sample); this.#host.input(sample, bounds.width);
    };
    const down = handler('begin'), move = handler('move'), up = handler('end'), cancel = handler('cancel');
    const lost = (event: PointerEvent): void => {
      if (this.#tracker.samples.some(sample => sample.pointerId === event.pointerId)) cancel(event);
    };
    canvas.addEventListener('pointerdown', down); canvas.addEventListener('pointermove', move); canvas.addEventListener('pointerup', up);
    canvas.addEventListener('pointercancel', cancel); canvas.addEventListener('lostpointercapture', lost);
    this.#disposeInput = () => {
      canvas.removeEventListener('pointerdown', down); canvas.removeEventListener('pointermove', move); canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', cancel); canvas.removeEventListener('lostpointercapture', lost); this.clearInput();
    };
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.#disposeInput?.(); this.#disposeInput = null; this.scale.off('resize', this.#drawGrid, this);
      this.game.events.off(Phaser.Core.Events.POST_RENDER, this.#postRender, this);
    });
  }
  clearInput(): void {
    for (const sample of this.#tracker.samples) {
      if (this.game.canvas.hasPointerCapture(sample.pointerId)) this.game.canvas.releasePointerCapture(sample.pointerId);
    }
    this.#tracker.clear(); this.#feedback.clear(); this.#proxy.clear(); this.#lastPosition = null; this.#pendingUI.clear(); this.#pendingVisual.clear();
  }
  #drawGrid(): void {
    const grid = this.#grid; if (!grid) return;
    grid.clear(); grid.lineStyle(1, 0x24323e, 1);
    for (let x = 0; x < this.scale.width; x += 48) { grid.moveTo(x, 0); grid.lineTo(x, this.scale.height); }
    for (let y = 0; y < this.scale.height; y += 48) { grid.moveTo(0, y); grid.lineTo(this.scale.width, y); }
    grid.strokePath();
  }
  override update(): void {
    // Ignore Phaser's smoothed delta. One frame pulse uses injected monotonic wall time.
    const nowMs = this.#host.nowMs();
    this.#frameStartedAtMs = nowMs;
    this.#frameDurationMs = this.#lastFrameAtMs === null ? 0 : nowMs - this.#lastFrameAtMs;
    this.#lastFrameAtMs = nowMs;
    const frame = this.#host.frame(nowMs);
    if (!frame.inputEnabled || frame.observation.sessionId !== this.#lastSession) this.clearInput();
    this.#lastSession = frame.observation.sessionId;
    this.#render(frame, nowMs);
  }
  #render(frame: PresentationFrame, nowMs: number): void {
    const shapes = this.#shapes; if (!shapes) return;
    shapes.clear();
    const enabled = frame.inputEnabled && frame.probeMode === 'B';
    const position = this.#proxy.position(frame.observation, frame.alpha, nowMs, frame.localDirection, enabled, 1000 / frame.debug.tickRate, 180);
    const current = frame.observation.entities[0]?.current;
    if (current) { shapes.lineStyle(2, 0x51cf88); shapes.strokeRect(this.scale.width / 2 + current.xWorld - 13, this.scale.height / 2 + current.yWorld - 13, 26, 26); }
    if (position) {
      shapes.fillStyle(enabled ? 0x68c8ff : 0xe5edf3); shapes.fillRect(this.scale.width / 2 + position.xWorld - 9, this.scale.height / 2 + position.yWorld - 9, 18, 18);
      const sampleId = enabled ? frame.localSampleId : frame.authoritativeSampleId;
      if (sampleId !== null && (frame.localDirection.xWorld !== 0 || frame.localDirection.yWorld !== 0) && this.#lastPosition && Math.hypot(position.xWorld - this.#lastPosition.xWorld, position.yWorld - this.#lastPosition.yWorld) > 0.000001) this.#pendingVisual.add(sampleId);
      this.#lastPosition = position;
    }
    if (this.#proxy.reconciled) this.#host.correction(this.#proxy.correctionWorld);
    const bounds = this.game.canvas.getBoundingClientRect();
    for (const sample of this.#tracker.samples) {
      shapes.lineStyle(2, 0xffd166); shapes.strokeCircle(sample.screenCssX * this.scale.width / bounds.width, sample.screenCssY * this.scale.height / bounds.height, 20);
    }
    for (const sample of this.#feedback.values()) {
      shapes.fillStyle(sample.phase === 'cancel' ? 0xff5c6c : 0xffd166); shapes.fillCircle(sample.screenCssX * this.scale.width / bounds.width, sample.screenCssY * this.scale.height / bounds.height, 5);
      this.#pendingUI.add(sample.sampleId);
    }
    this.#feedback.clear();
    if (nowMs - this.#lastUIAtMs >= 100) {
      this.#lastUIAtMs = nowMs;
      const status = document.querySelector('#status');
      if (status) status.textContent = `${frame.probeMode} · ${frame.debug.state} [${frame.debug.pauseReasons.join(',')}] · Tick ${frame.debug.tick} @ ${frame.debug.tickRate} Hz（基线未定案） · 帧 ${this.#frameDurationMs.toFixed(1)} ms · ${frame.debug.ticksThisFrame} Tick/帧 · α ${frame.alpha.toFixed(2)} · 积压 ${frame.debug.backlogMs.toFixed(1)} ms · 指针 ${this.#tracker.size} · hash ${frame.debug.hash}`;
      const overlay = document.querySelector<HTMLElement>('#overlay');
      if (overlay) { overlay.hidden = frame.debug.state === 'running'; overlay.textContent = frame.debug.pauseReasons.includes('orientation') ? '请转为横屏，再点击恢复' : `已暂停：${frame.debug.pauseReasons.join(',') || frame.debug.state}；条件解除后点击恢复`; }
    }
  }
  #postRender(): void {
    const atMs = this.#host.nowMs();
    for (const sampleId of this.#pendingUI) this.#host.markUI(sampleId, atMs);
    for (const sampleId of this.#pendingVisual) this.#host.markVisual(sampleId, atMs);
    this.#pendingUI.clear(); this.#pendingVisual.clear();
    if (this.#frameStartedAtMs) this.#host.frameCpu(atMs - this.#frameStartedAtMs);
  }
}

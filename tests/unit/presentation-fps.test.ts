import { afterEach, expect, it, vi } from 'vitest';
import type { PresentationHost } from '../../src/contracts/index';
import { createPresentation } from '../../src/presentation/index';
const game = vi.hoisted(() => vi.fn(function () { throw new Error('configuration captured'); }));
vi.mock('phaser', () => ({ default: { Game: game, WEBGL: 2, Scale: { FIT: 3, CENTER_BOTH: 1 } } }));
vi.mock('../../src/presentation/phaser/scenes/probe-scene', () => ({ ProbeScene: class {} }));
afterEach(() => { vi.unstubAllGlobals(); game.mockClear(); });
it('constructs the actual Phaser Game without a second 60 FPS limiter (Android regression)', () => {
  vi.stubGlobal('window', { innerWidth: 960, innerHeight: 540 });
  const host: PresentationHost = { nowMs: () => 0, frame: () => { throw new Error('unused'); }, input: () => {},
    clearInput: () => {}, debug: () => {}, markUI: () => {}, markVisual: () => {}, correction: () => {}, frameCpu: () => {} };
  expect(() => createPresentation(host)).toThrow('configuration captured');
  expect(game).toHaveBeenCalledWith(expect.objectContaining({ fps: { target: 60, limit: 0, smoothStep: false } }));
});

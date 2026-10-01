import Phaser from 'phaser';
import type { PresentationHost } from '../contracts/index';
import { ProbeScene } from './phaser/scenes/probe-scene';
export function createPresentation(host: PresentationHost): Readonly<{ canvas: HTMLCanvasElement; clearInput(): void; dispose(): void }> {
  const size = (): { width: number; height: number } => {
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const height = Math.min(540, Math.sqrt(750000 / aspect));
    return { width: Math.round(height * aspect), height: Math.round(height) };
  };
  const scene = new ProbeScene(host);
  const game = new Phaser.Game({ type: Phaser.WEBGL, parent: 'app', ...size(), backgroundColor: '#111a22',
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    fps: { target: 60, limit: 0, smoothStep: false }, audio: { noAudio: true }, input: { mouse: false, touch: false, keyboard: false }, scene: [scene] });
  const resize = (): void => { const dimensions = size(); game.scale.resize(dimensions.width, dimensions.height); };
  window.addEventListener('resize', resize);
  const actions = ['pause', 'resume', 'step', 'recreate', 'modeA', 'modeB', 'export', 'empty', 'probe'] as const;
  const listeners: Array<() => void> = [];
  for (const action of actions) {
    const element = document.querySelector(`[data-action="${action}"]`);
    const callback = (): void => { host.clearInput(); scene.clearInput(); host.debug(action); };
    element?.addEventListener('click', callback); listeners.push(() => element?.removeEventListener('click', callback));
  }
  let disposed = false;
  return Object.freeze({ canvas: game.canvas, clearInput: () => scene.clearInput(), dispose: () => {
    if (disposed) return; disposed = true; listeners.forEach(remove => remove()); window.removeEventListener('resize', resize); scene.clearInput(); game.destroy(true);
  } });
}

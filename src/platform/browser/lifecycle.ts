import type { PauseReason } from '../../contracts/index';
export function monotonicNowMs(): number { return performance.now(); }
export function bindLifecycle(canvas: HTMLCanvasElement, pause: (reason: PauseReason) => void, release: (reason: PauseReason) => void, clear: () => void): () => void {
  let disposed = false;
  const visibility = (): void => { clear(); if (document.hidden) pause('hidden'); else release('hidden'); };
  const blur = (): void => { clear(); pause('hidden'); };
  const focus = (): void => { if (!document.hidden) release('hidden'); };
  const orientation = (): void => { clear(); if (window.innerHeight > window.innerWidth) pause('orientation'); else release('orientation'); };
  const lost = (event: Event): void => { event.preventDefault(); clear(); pause('contextLost'); };
  const restored = (): void => { release('contextLost'); };
  const pagehide = (): void => { clear(); pause('hidden'); };
  document.addEventListener('visibilitychange', visibility); window.addEventListener('blur', blur); window.addEventListener('focus', focus);
  window.addEventListener('resize', orientation); window.addEventListener('pagehide', pagehide); window.addEventListener('pageshow', focus);
  canvas.addEventListener('webglcontextlost', lost); canvas.addEventListener('webglcontextrestored', restored);
  visibility(); orientation();
  return () => {
    if (disposed) return; disposed = true;
    document.removeEventListener('visibilitychange', visibility); window.removeEventListener('blur', blur); window.removeEventListener('focus', focus);
    window.removeEventListener('resize', orientation); window.removeEventListener('pagehide', pagehide); window.removeEventListener('pageshow', focus);
    canvas.removeEventListener('webglcontextlost', lost); canvas.removeEventListener('webglcontextrestored', restored);
  };
}
export function environmentReport(canvas: HTMLCanvasElement): object {
  const gl = canvas.getContext('webgl') ?? canvas.getContext('webgl2');
  return { userAgent: navigator.userAgent, cssWidth: window.innerWidth, cssHeight: window.innerHeight, devicePixelRatio: window.devicePixelRatio,
    backbufferWidth: canvas.width, backbufferHeight: canvas.height, webgl: gl?.getParameter(gl.VERSION) as unknown,
    maxTextureSize: gl?.getParameter(gl.MAX_TEXTURE_SIZE) as unknown, renderer: gl?.getParameter(gl.RENDERER) as unknown };
}
export function downloadJSON(name: string, report: object): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
}

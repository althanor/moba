import type { DebugAction, PresentationHost } from '../../contracts/index';

const clearsInput = {
  pause: true, resume: true, step: true, recreate: true, modeA: true,
  modeB: true, export: true, empty: true, probe: true, control: false
} satisfies Record<DebugAction, boolean>;

// Pointer Events click retains the originating pointerType. A touch/pen press
// belongs exclusively to pointerdown; mouse and non-pointer activation to click.
// preventDefault alone does NOT guarantee suppression of click.
export function bindToolbarAction(element: HTMLButtonElement, action: DebugAction,
  host: PresentationHost, clearSceneInput: () => void): () => void {
  let count = 0;
  element.dataset.activationCount = '0';
  const activate = (source: string): void => {
    if (element.disabled) return;
    element.dataset.activationCount = String(++count);
    element.dataset.activationSource = source;
    if (clearsInput[action]) { host.clearInput(); clearSceneInput(); }
    host.debug(action);
  };
  const down = (event: PointerEvent): void => {
    if ((event.pointerType !== 'touch' && event.pointerType !== 'pen') || event.button !== 0) return;
    event.preventDefault();
    activate(event.pointerType);
  };
  const click = (event: MouseEvent): void => {
    if ('pointerType' in event && (event.pointerType === 'touch' || event.pointerType === 'pen')) return;
    // Older Chromium MouseEvent compatibility clicks identify touch provenance.
    const capabilities = (event as MouseEvent & { sourceCapabilities?: { firesTouchEvents: boolean } | null }).sourceCapabilities;
    if (capabilities?.firesTouchEvents) return;
    activate('click');
  };
  element.addEventListener('pointerdown', down);
  element.addEventListener('click', click);
  return () => {
    element.removeEventListener('pointerdown', down);
    element.removeEventListener('click', click);
  };
}

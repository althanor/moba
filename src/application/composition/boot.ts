import { matchId, sessionId } from '../../foundation/index';
import type { PresentationHost, ProbeMode, ShellConfig } from '../../contracts/index';
import { createSimulation } from '../../simulation/index';
import { ProbeController } from '../../controllers/index';
import { createPresentation } from '../../presentation/index';
import { bindLifecycle, downloadJSON, environmentReport, monotonicNowMs } from '../../platform/index';
import { Session } from '../session/session';
import { ProbeRecorder } from '../debug/probe-recorder';

export function boot(): () => void {
  let serial = 0;
  let mode: ProbeMode = 'A';
  let shellMode: ShellConfig['mode'] = 'response-probe';
  const controller = new ProbeController();
  let recorder = new ProbeRecorder(monotonicNowMs());
  let authoritativeSampleId: number | null = null;
  let pendingSample: { sequence: number; sampleId: number } | null = null;
  let presentation: ReturnType<typeof createPresentation> | null = null;
  const clearInput = (): void => { controller.clear(); presentation?.clearInput(); authoritativeSampleId = null; pendingSample = null; };
  const createSession = (): Session => {
    serial++;
    const config: ShellConfig = Object.freeze({ sessionId: sessionId(`session-${serial}`), matchId: matchId(`m1-probe-${serial}`), tickRate: 30, mode: shellMode, probeSpeedWorldPerSecond: 180 });
    const session = new Session(config, createSimulation(config), {
      clearInput,
      measureTick: step => { const startedAtMs = monotonicNowMs(); const output = step(); recorder.tick(monotonicNowMs() - startedAtMs); return output; },
      beforeTick: active => {
        const intent = controller.consume();
        if (!intent) return;
        const result = active.command(intent.direction);
        if (result?.outcome === 'queued' && intent.sampleId !== null) {
          pendingSample = { sequence: result.sequence, sampleId: intent.sampleId }; recorder.queued(intent.sampleId, monotonicNowMs());
        }
      },
      completedTick: output => {
        if (!pendingSample) return;
        const result = output.commandResults.find(item => item.sequence === pendingSample?.sequence);
        if (!result) return;
        if (result.outcome === 'accepted') {
          const motion = output.observation.entities[0];
          const moved = !!motion && (motion.current.xWorld !== motion.previous.xWorld || motion.current.yWorld !== motion.previous.yWorld);
          authoritativeSampleId = moved ? pendingSample.sampleId : null; recorder.accepted(pendingSample.sampleId, monotonicNowMs(), moved);
        } else clearInput();
        pendingSample = null;
      }
    });
    session.start(); return session;
  };
  let session = createSession();
  const recreate = (): void => { session.dispose(); recorder = new ProbeRecorder(monotonicNowMs()); clearInput(); session = createSession(); syncConditions(); };
  const syncConditions = (): void => {
    if (document.hidden || !document.hasFocus()) session.pause('hidden');
    if (window.innerHeight > window.innerWidth) session.pause('orientation');
  };
  const host: PresentationHost = {
    nowMs: monotonicNowMs,
    frame: nowMs => {
      try { session.frame(nowMs); }
      catch (error) { const status = document.querySelector('#error'); if (status) status.textContent = String(error); }
      recorder.frame(nowMs);
      return Object.freeze({ observation: session.observation, delta: session.delta, alpha: session.alpha, debug: session.debug(),
        probeMode: mode, localDirection: controller.intent.direction, localSampleId: controller.intent.sampleId,
        authoritativeSampleId, inputEnabled: session.state === 'running' });
    },
    input: (sample, widthCss) => { if (session.state === 'running') { recorder.capture(sample); controller.sample(sample, widthCss); } },
    clearInput,
    debug: action => {
      switch (action) {
        case 'pause': session.pause('user'); break;
        case 'resume': session.releaseReason('user'); session.releaseReason('overload'); session.resume(); break;
        case 'step': session.singleStep(); break;
        case 'recreate': recreate(); break;
        case 'modeA': mode = 'A'; recreate(); break;
        case 'modeB': mode = 'B'; recreate(); break;
        case 'empty': shellMode = 'empty'; recreate(); break;
        case 'probe': shellMode = 'response-probe'; recreate(); break;
        case 'export': downloadJSON(`M1-${mode}-session-${serial}.json`, { version: '0.2.0', phase: 'M1', androidAcceptance: 'pending user hardware execution',
          config: session.config, renderTargetHz: 60, mode, interpolation: mode === 'A' ? 'previous/current' : 'VisualProxy <= 1 step',
          environment: presentation ? environmentReport(presentation.canvas) : {}, measurement: recorder.export(monotonicNowMs()), debug: session.debug() }); break;
      }
    },
    markUI: (id, atMs) => recorder.ui(id, atMs), markVisual: (id, atMs) => recorder.visual(id, atMs), correction: distanceWorld => recorder.correction(distanceWorld), frameCpu: durationMs => recorder.frameCpu(durationMs)
  };
  presentation = createPresentation(host);
  const disposeLifecycle = bindLifecycle(presentation.canvas, reason => session.pause(reason), reason => session.releaseReason(reason), clearInput);
  let disposed = false;
  return () => { if (disposed) return; disposed = true; clearInput(); disposeLifecycle(); presentation?.dispose(); session.dispose(); };
}

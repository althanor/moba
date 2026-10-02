import { matchId, sessionId } from '../../foundation/index';
import type { PresentationHost, ProbeMode } from '../../contracts/index';
import { compileContent, parseProfile } from '../../content/index';
import { createCombatRuntime } from '../../simulation/index';
import { GameplayController } from '../../controllers/index';
import { createPresentation } from '../../presentation/index';
import { battleAssets, bindLifecycle, downloadJSON, environmentReport, monotonicNowMs } from '../../platform/index';
import { Session } from '../session/session';
import { ProbeRecorder } from '../debug/probe-recorder';
export function bootBattle(): () => void {
    const assets = battleAssets(), compiled = compileContent(assets.content, 30);
    if (!compiled.ok)
        throw new Error(JSON.stringify(compiled.diagnostics));
    const catalog = compiled.catalog, profile = parseProfile(assets.profile), g = catalog.document.gameplay;
    if (!g)
        throw new Error('battle gameplay required');
    let serial = 0, mode: ProbeMode = 'A', presentation: ReturnType<typeof createPresentation> | null = null, recorder = new ProbeRecorder(monotonicNowMs()), authoritativeSampleId: number | null = null;
    let releaseSampleIds: number[] = [];
    const casting = new Map<number, {
        action: string;
        charges: number;
    }>();
    const controller = new GameplayController(), pending = new Map<number, {
        sampleId: number;
        kind: string;
        action: string | null;
        charges: number;
    }>();
    let runtime: ReturnType<typeof createCombatRuntime>;
    const clearInput = (): void => { controller.clear(); runtime?.simulation.neutralizeInput(); pending.clear(); casting.clear(); releaseSampleIds = []; authoritativeSampleId = null; presentation?.clearInput(); };
    const createSession = (): Session => {
        serial++;
        runtime = createCombatRuntime({ catalog, profile, sessionId: sessionId(`battle-${serial}`), matchId: matchId(`battle-${serial}`), tickRate: 30, seed: 42, roster: g.spawns.map(() => ({ level: 1, base: {} })) }, { factArchive: 'summary' });
        const session = new Session({ sessionId: sessionId(`battle-${serial}`), matchId: matchId(`battle-${serial}`), tickRate: 30, mode: 'empty', probeSpeedWorldPerSecond: 0 }, runtime.simulation, { clearInput,
            beforeTick: s => { for (const request of controller.consume()) {
                const r = s.submit(request);
                if (r?.outcome === 'queued') {
                    pending.set(r.sequence, { sampleId: request.sampleId, kind: request.kind, action: request.payload.action, charges: s.observation.battle?.units[0]?.cooldowns.find(c => c.id === request.payload.action)?.charges ?? 0 });
                    recorder.queued(request.sampleId, monotonicNowMs());
                }
                else if (r)
                    recorder.rejected(request.sampleId, r.reason ?? 'rejected');
            } },
            measureTick: step => { const start = monotonicNowMs(), output = step(); recorder.tick(monotonicNowMs() - start); return output; },
            completedTick: output => { if (output.observation.battle)
                recorder.gameplay(output.observation.battle, output.observation.tick, monotonicNowMs()); for (const r of output.commandResults) {
                const p = pending.get(r.sequence);
                if (!p)
                    continue;
                const actor = output.observation.battle?.units[0], moved = p.kind === 'move' && !!actor && (actor.position.xWorld !== actor.previous.xWorld || actor.position.yWorld !== actor.previous.yWorld);
                if (r.outcome === 'accepted') {
                    recorder.accepted(p.sampleId, monotonicNowMs(), moved);
                    if (moved)
                        authoritativeSampleId = p.sampleId;
                    if (p.kind === 'cast' && p.action)
                        casting.set(p.sampleId, { action: p.action, charges: p.charges });
                }
                else
                    recorder.rejected(p.sampleId, r.reason ?? 'rejected');
                pending.delete(r.sequence);
            } const actor = output.observation.battle?.units[0]; for (const [sampleId, cast] of casting) {
                if ((actor?.cooldowns.find(c => c.id === cast.action)?.charges ?? cast.charges) < cast.charges) {
                    releaseSampleIds.push(sampleId);
                    recorder.released(sampleId, monotonicNowMs());
                    casting.delete(sampleId);
                }
                else if (actor?.phase === 'ready') {
                    recorder.rejected(sampleId, 'actionInterrupted');
                    casting.delete(sampleId);
                }
            } }
        });
        session.start();
        return session;
    };
    let session = createSession();
    const sync = (): void => { if (document.hidden || !document.hasFocus())
        session.pause('hidden'); if (window.innerHeight > window.innerWidth)
        session.pause('orientation'); };
    const recreate = (): void => { session.dispose(); clearInput(); recorder = new ProbeRecorder(monotonicNowMs()); session = createSession(); sync(); };
    const host: PresentationHost = { nowMs: monotonicNowMs, frame: now => {
            try {
                session.frame(now);
            }
            catch (error) {
                const status = document.querySelector('#error');
                if (status)
                    status.textContent = String(error);
            }
            recorder.frame(now);
            const preview = session.observation.battle ? controller.previewFor(session.observation.battle) : null, samples = releaseSampleIds;
            releaseSampleIds = [];
            return { observation: session.observation, delta: session.delta, alpha: session.alpha, debug: session.debug(), probeMode: mode, localDirection: controller.intent.direction, localSampleId: controller.intent.sampleId, authoritativeSampleId, releaseSampleIds: samples, inputEnabled: session.state === 'running', ...(preview ? { aimPreview: { point: preview.point, radiusWorld: preview.action.radiusWorld, cancel: preview.cancel, sampleId: preview.sampleId } } : {}) };
        }, input: (sample, width, height) => { const view = session.observation.battle; if (session.state !== 'running' || !view)
            return; const interaction = controller.sample(sample, width, height ?? window.innerHeight, view); recorder.capture(sample, interaction); }, clearInput,
        debug: action => { switch (action) {
            case 'pause':
                session.pause('user');
                break;
            case 'resume':
                session.releaseReason('user');
                session.releaseReason('overload');
                session.resume();
                break;
            case 'step':
                session.singleStep();
                break;
            case 'recreate':
                recreate();
                break;
            case 'modeA':
                mode = 'A';
                recreate();
                break;
            case 'modeB':
                mode = 'B';
                recreate();
                break;
            case 'empty':
                window.location.search = '?probe';
                break;
            case 'probe':
                window.location.search = '?probe';
                break;
            case 'control': {
                const view = session.observation.battle, target = view?.units[0], source = view?.units[1];
                if (target && source)
                    session.submit({ kind: 'cast', payload: { action: g.actions.find(a => a.id === 'bolt')?.id ?? null, point: target.position, target: target.ref, direction: { xWorld: 0, yWorld: 0 } } }, { actorRef: source.ref, controllerId: 'target' });
                break;
            }
            case 'export':
                downloadJSON(`M3-${mode}-session-${serial}.json`, { version: __BUILD_INFO__.version, phase: 'M3', build: __BUILD_INFO__, config: { tickRate: 30, contentHash: catalog.contentHash, certificateId: catalog.certificate.id, profile: profile.id }, mode, environment: presentation ? environmentReport(presentation.canvas) : {}, measurement: recorder.export(monotonicNowMs()), debug: session.debug(), capacity: runtime.debug.boundary().capacity, battle: session.observation.battle, acceptanceReference: 'docs/M3_ACCEPTANCE.md', hardwareStatus: 'awaiting Android gameplay A/B and representative thermal/second device evidence' });
                break;
        } },
        markUI: (id, at) => recorder.ui(id, at), markVisual: (id, at) => recorder.visual(id, at), correction: d => recorder.correction(d), frameCpu: ms => recorder.frameCpu(ms) };
    const guide = document.querySelector('#guide');
    if (guide)
        guide.textContent = '左下摇杆移动；右下六个技能按下拖拽瞄准，松开释放，拖向右上取消；点目标锁定；右上 × 中断当前动作。HP/资源/状态按权威 Tick 更新。';
    presentation = createPresentation(host, 'battle');
    sync();
    const disposeLifecycle = bindLifecycle(presentation.canvas, r => session.pause(r), r => session.releaseReason(r), clearInput);
    let disposed = false;
    return () => { if (disposed)
        return; disposed = true; clearInput(); disposeLifecycle(); presentation?.dispose(); session.dispose(); };
}

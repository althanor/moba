import fixture from '../../content/m2-fixture.json';
import profileData from '../../content/m2-profile.json';
import { compileContent, parseProfile } from '../../src/content/index';
import type { CompiledCatalog, ContentId, EngineCapacityProfile } from '../../src/contracts/index';
import { matchId, sessionId } from '../../src/foundation/index';
import { createCombatRuntime } from '../../src/simulation/index';

export function rawFixture() { return structuredClone(fixture); }
export function compile(raw: unknown = rawFixture(), rate = 30): CompiledCatalog {
  const result = compileContent(raw, rate); if (!result.ok) throw new Error(JSON.stringify(result.diagnostics)); return result.catalog;
}
export function profile(): EngineCapacityProfile { return parseProfile(profileData); }
export function contentId(catalog: CompiledCatalog, value: string): ContentId {
  const found = [...catalog.document.effects, ...catalog.document.modifiers, ...catalog.document.formulas, ...catalog.document.attributes, ...catalog.document.ruleset.producers].find(d => d.id === value);
  if (!found) throw new Error(`fixture ID:${value}`); return found.id;
}
export function harness(count = 1, raw: unknown = rawFixture(), factArchive: 'full' | 'summary' = 'full', capacityProfile: EngineCapacityProfile = profile()) {
  const catalog = compile(raw);
  const config = { matchId: matchId('m2'), sessionId: sessionId('m2-test'), tickRate: 30, seed: 459, catalog, profile: capacityProfile, roster: Array.from({ length: count }, () => ({ level: 1, base: {} })) };
  const runtime = createCombatRuntime(config, { factArchive }); let sequence = 0;
  const refs = runtime.debug.boundary().entities.map(e => e.ref);
  function submit(effect: string, targetTick: number, targets = refs, actor = refs[0]) {
    if (!actor) throw new Error('fixture actor');
    return runtime.simulation.enqueue({ matchId: config.matchId, kind: 'debugEffect', controllerId: 'fixture', sequence: ++sequence, targetTick, actorRef: actor, producer: contentId(catalog, 'fixture'), effect: contentId(catalog, effect), targets });
  }
  return { ...runtime, refs, catalog, config, submit };
}
export function hp(h: ReturnType<typeof harness>, index = 0): number {
  const value = h.debug.boundary().entities[index]?.resources.find(r => r.id === 'health')?.current;
  if (value === undefined) throw new Error('fixture Health'); return value;
}

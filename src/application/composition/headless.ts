import type { CombatConfig, CombatDebugPort, CommandResult, CompiledCatalog } from '../../contracts/index';
import { compileContent, validateProfile } from '../../content/index';
import { createCombatRuntime } from '../../simulation/index';
import { Session } from '../session/session';

export function createHeadlessCombatSession(content: unknown, config: Omit<CombatConfig, 'catalog'>): {
  readonly session: Session; readonly debug: CombatDebugPort; readonly catalog: CompiledCatalog;
  readonly submit: (command: unknown) => CommandResult;
} {
  const compiled = compileContent(content, config.tickRate);
  if (!compiled.ok) throw new Error(compiled.diagnostics.map(d => `${d.code}:${d.path}:${d.message}`).join('\n'));
  const errors = validateProfile(compiled.catalog.certificate, config.profile);
  if (errors.length) throw new Error(`profile rejected:${errors.join(',')}`);
  const runtime = createCombatRuntime({ ...config, catalog: compiled.catalog });
  const session = new Session({ sessionId: config.sessionId, matchId: config.matchId, tickRate: config.tickRate, mode: 'empty', probeSpeedWorldPerSecond: 0 }, runtime.simulation, { clearInput: () => {}, beforeTick: () => {}, completedTick: () => {} });
  return Object.freeze({ session, debug: runtime.debug, catalog: compiled.catalog, submit: runtime.simulation.enqueue });
}

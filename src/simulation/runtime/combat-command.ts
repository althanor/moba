import { M2_COMMAND_LIMITS } from '../../contracts/index';
import type { ContentId, EffectCommand, EntityRef } from '../../contracts/index';
import { noScan, ordered } from '../shared/work';
import type { Scan } from '../shared/work';
import { matchId } from '../../foundation/index';

function record(v: unknown): v is Record<string, unknown> { return v !== null && typeof v === 'object' && !Array.isArray(v); }
function ref(v: unknown): EntityRef | null {
  if (!record(v)) return null;
  const i = v['index'], g = v['generation'];
  return typeof i === 'number' && Number.isSafeInteger(i) && i >= 0 && typeof g === 'number' && Number.isSafeInteger(g) && g > 0 ? { index: i, generation: g } : null;
}
export function parseEffectCommand(v: unknown, scan: Scan = noScan): EffectCommand | null {
  if (!record(v)) return null;
  for (const key in v) { scan('scheduler', 1); if (!['matchId', 'kind', 'controllerId', 'sequence', 'targetTick', 'actorRef', 'producer', 'effect', 'targets'].includes(key)) return null; }
  const actorRef = ref(v['actorRef']), sequence = v['sequence'], targetTick = v['targetTick'], targets = v['targets'];
  if (!actorRef || v['kind'] !== 'debugEffect' || v['controllerId'] !== 'fixture' || typeof v['matchId'] !== 'string' || !v['matchId'] || v['matchId'].length > 96 || typeof sequence !== 'number' || !Number.isSafeInteger(sequence) || sequence < 1 || typeof targetTick !== 'number' || !Number.isSafeInteger(targetTick) || targetTick < 1 || typeof v['producer'] !== 'string' || typeof v['effect'] !== 'string' || v['producer'].length > 96 || v['effect'].length > 96 || !Array.isArray(targets) || targets.length > M2_COMMAND_LIMITS.targets) return null;
  const refs: EntityRef[] = [];
  for (const target of targets) { scan('query', 1); const r = ref(target); if (!r) return null; refs.push(r); }
  // The brands distinguish validated string kinds; reference resolution follows at the authoritative entrance.
  return { matchId: matchId(v['matchId']), kind: 'debugEffect', controllerId: 'fixture', sequence, targetTick, actorRef, producer: v['producer'] as ContentId, effect: v['effect'] as ContentId, targets: ordered(refs, (a, b) => a.index - b.index || a.generation - b.generation, scan) };
}

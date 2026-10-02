import type { GameplayCommand, ContentId } from '../../contracts/index';
import type { MatchId } from '../../foundation/index';
type Input = Record<string, unknown>;
function fields(value: unknown, allowed: readonly string[], scan: (n: number) => void): value is Input {
    if (!value || typeof value !== 'object' || Array.isArray(value))
        return false;
    let count = 0;
    for (const key in value) {
        scan(1);
        if (++count > allowed.length || !Object.hasOwn(value, key) || !allowed.includes(key))
            return false;
    }
    return count === allowed.length;
}
function ref(v: unknown, scan: (n: number) => void): v is GameplayCommand['actorRef'] { return fields(v, ['index', 'generation'], scan) && Number.isSafeInteger(v['index']) && Number(v['index']) >= 0 && Number.isSafeInteger(v['generation']) && Number(v['generation']) > 0; }
function vec(v: unknown, scan: (n: number) => void): v is GameplayCommand['payload']['point'] { return fields(v, ['xWorld', 'yWorld'], scan) && typeof v['xWorld'] === 'number' && Number.isFinite(v['xWorld']) && Math.abs(v['xWorld']) <= 4096 && typeof v['yWorld'] === 'number' && Number.isFinite(v['yWorld']) && Math.abs(v['yWorld']) <= 4096; }
export function parseGameplayCommand(value: unknown, scan: (n: number) => void): GameplayCommand | null {
    if (!fields(value, ['matchId', 'controllerId', 'sequence', 'targetTick', 'actorRef', 'kind', 'payload'], scan))
        return null;
    const v = value;
    if (typeof v['matchId'] !== 'string' || v['matchId'].length > 96 || typeof v['controllerId'] !== 'string' || !/^[a-zA-Z0-9_.:-]{1,96}$/.test(v['controllerId']) || !Number.isSafeInteger(v['sequence']) || Number(v['sequence']) < 1 || !Number.isSafeInteger(v['targetTick']) || Number(v['targetTick']) < 1 || !ref(v['actorRef'], scan) || !['move', 'cast', 'cancelAction', 'targetLock'].includes(String(v['kind'])))
        return null;
    const q = v['payload'];
    if (!fields(q, ['direction', 'point', 'action', 'target'], scan))
        return null;
    if (!vec(q['direction'], scan) || Math.hypot(q['direction'].xWorld, q['direction'].yWorld) > 1.000000001 || !vec(q['point'], scan) || q['action'] !== null && (typeof q['action'] !== 'string' || !/^[a-zA-Z0-9_.:-]{1,64}$/.test(q['action'])) || q['target'] !== null && !ref(q['target'], scan))
        return null;
    return { matchId: v['matchId'] as MatchId, controllerId: v['controllerId'], sequence: Number(v['sequence']), targetTick: Number(v['targetTick']), actorRef: v['actorRef'], kind: v['kind'] as GameplayCommand['kind'], payload: { direction: q['direction'], point: q['point'], action: q['action'] as ContentId | null, target: q['target'] as GameplayCommand['payload']['target'] } };
}

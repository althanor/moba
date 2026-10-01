import { direction, finite, hashNumbers, integer, tick } from '../../foundation/index';
import type { Vec2 } from '../../foundation/index';
import type { CommandResult, MotionSample, Observation, ProbeCommand, RejectReason, ShellConfig, SimulationPort, TickOutput } from '../../contracts/index';
import { EntityStore } from '../kernel/entity-store';

function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null; }
function parseCommand(value: unknown): ProbeCommand | null {
  if (!record(value) || !record(value['actorRef']) || !record(value['payload'])) return null;
  const ref = value['actorRef']; const payload = value['payload'];
  if (typeof value['matchId'] !== 'string' || value['controllerId'] !== 'probe-player' || value['kind'] !== 'debugProbeDirection' ||
    !Number.isSafeInteger(value['sequence']) || typeof value['sequence'] !== 'number' || value['sequence'] < 1 ||
    !Number.isSafeInteger(value['targetTick']) || typeof value['targetTick'] !== 'number' || value['targetTick'] < 1 ||
    !Number.isSafeInteger(ref['index']) || typeof ref['index'] !== 'number' || ref['index'] < 0 ||
    !Number.isSafeInteger(ref['generation']) || typeof ref['generation'] !== 'number' || ref['generation'] < 1 ||
    typeof payload['xWorld'] !== 'number' || !Number.isFinite(payload['xWorld']) ||
    typeof payload['yWorld'] !== 'number' || !Number.isFinite(payload['yWorld']) || Math.hypot(payload['xWorld'], payload['yWorld']) > 1.000000001) return null;
  // Copy only declared fields; never retain caller-owned input objects.
  return Object.freeze({ matchId: value['matchId'] as ProbeCommand['matchId'], controllerId: 'probe-player', kind: 'debugProbeDirection',
    sequence: value['sequence'], targetTick: tick(value['targetTick']),
    actorRef: Object.freeze({ index: ref['index'], generation: ref['generation'] }),
    payload: direction(payload['xWorld'], payload['yWorld']) });
}
function key(command: ProbeCommand): string {
  return [command.matchId, command.targetTick, command.actorRef.index, command.actorRef.generation, command.payload.xWorld, command.payload.yWorld].join('|');
}

// Private to runtime. No World, component array or write capability is exported.
class ShellWorld {
  readonly entities: EntityStore;
  tickIndex = tick(0);
  previous: Vec2 = Object.freeze({ xWorld: 0, yWorld: 0 });
  current: Vec2 = Object.freeze({ xWorld: 0, yWorld: 0 });
  intent = direction(0, 0);
  constructor(readonly config: ShellConfig) {
    this.entities = new EntityStore(config.sessionId);
    if (config.mode === 'response-probe') this.entities.create();
  }
  motion(): readonly MotionSample[] {
    return Object.freeze(this.entities.refs().map(ref => Object.freeze({ ref,
      previous: Object.freeze({ ...this.previous }), current: Object.freeze({ ...this.current }), discontinuity: false })));
  }
}

export function createSimulation(inputConfig: ShellConfig): SimulationPort {
  integer(inputConfig.tickRate, 'tickRate', 1); finite(inputConfig.probeSpeedWorldPerSecond, 'probe speed');
  if (inputConfig.probeSpeedWorldPerSecond < 0) throw new RangeError('negative probe speed');
  const config = Object.freeze({ ...inputConfig });
  const world = new ShellWorld(config);
  let disposed = false;
  let clearAtP1 = false;
  let createdSent = false;
  let expiredSequence = 0;
  let queue: ProbeCommand[] = [];
  let cancelled: ProbeCommand[] = [];
  const history = new Map<number, { fingerprint: string; result: CommandResult }>();
  function result(sequence: number, outcome: CommandResult['outcome'], reason: RejectReason | null): CommandResult {
    return Object.freeze({ sequence, tick: world.tickIndex, outcome, reason });
  }
  function remember(command: ProbeCommand, value: CommandResult): void {
    history.set(command.sequence, { fingerprint: key(command), result: value });
    // Bounded retry window. Older keys are explicitly rejected rather than re-executed.
    if (history.size > 512) {
      const completed = [...history.keys()].filter(sequence => !queue.some(command => command.sequence === sequence) && !cancelled.some(command => command.sequence === sequence)).sort((a, b) => a - b);
      const first = completed[0];
      if (first !== undefined) { history.delete(first); expiredSequence = Math.max(expiredSequence, first); }
    }
  }
  function observe(): Observation {
    return Object.freeze({ sessionId: config.sessionId, matchId: config.matchId, observer: 'probe-player', team: 0, tick: world.tickIndex, entities: world.motion() });
  }
  function assertActive(): void { if (disposed) throw new Error('simulation disposed'); }
  return Object.freeze({
    enqueue(value: unknown): CommandResult {
      const command = parseCommand(value);
      if (disposed) return result(command?.sequence ?? -1, 'rejected', 'disposed');
      if (!command) return result(-1, 'rejected', 'schema');
      if (command.matchId !== config.matchId) return result(command.sequence, 'rejected', 'wrongMatch');
      const seen = history.get(command.sequence);
      if (seen) return seen.fingerprint === key(command) ? seen.result : result(command.sequence, 'rejected', 'sequenceConflict');
      if (command.sequence <= expiredSequence) return result(command.sequence, 'rejected', 'sequenceExpired');
      let reason: RejectReason | null = null;
      if (!world.entities.valid({ sessionId: config.sessionId, ref: command.actorRef })) reason = 'invalidActor';
      else if (command.targetTick <= world.tickIndex) reason = 'staleTick';
      else if (command.targetTick > world.tickIndex + 90) reason = 'futureTick';
      else if (queue.length + cancelled.length >= 512) reason = 'queueFull';
      else if (queue.filter(item => item.targetTick === command.targetTick).length >= 32) reason = 'seatLimit';
      const valueResult = result(command.sequence, reason ? 'rejected' : 'queued', reason);
      if (!reason) queue.push(command);
      remember(command, valueResult); return valueResult;
    },
    step(): TickOutput {
      assertActive();
      const results: CommandResult[] = [];
      // P0: integer authoritative time. Remaining P0 systems await later milestones.
      world.tickIndex = tick(world.tickIndex + 1);
      // P1: input neutralization is committed at a Tick barrier, never from DOM.
      if (clearAtP1) {
        world.intent = direction(0, 0);
        for (const command of cancelled) { const value = result(command.sequence, 'rejected', 'inputCleared'); results.push(value); remember(command, value); }
        cancelled = []; clearAtP1 = false;
      }
      const commands = queue.filter(command => command.targetTick === world.tickIndex).sort((a, b) => a.sequence - b.sequence);
      queue = queue.filter(command => command.targetTick !== world.tickIndex);
      // M1 has one probe seat. Latest same-Tick direction wins; no gameplay action exists.
      for (const command of commands) {
        world.intent = command.payload;
        const value = result(command.sequence, 'accepted', null); results.push(value); remember(command, value);
      }
      // P2: empty. P3: isolated response fixture on a collision-free public plane.
      world.previous = world.current;
      const distanceWorld = config.probeSpeedWorldPerSecond / config.tickRate;
      world.current = Object.freeze({ xWorld: finite(world.current.xWorld + world.intent.xWorld * distanceWorld, 'probe x'),
        yWorld: finite(world.current.yWorld + world.intent.yWorld * distanceWorld, 'probe y') });
      // P4/P5/P6/P7: deliberately empty. No collision/visibility/combat/rewards.
      // P8: structural barrier.
      world.entities.commitStructure();
      // P9: empty authorised stream, or the explicitly owned debug probe only.
      const observation = observe();
      const created = createdSent ? Object.freeze([]) : observation.entities;
      const changed = createdSent ? observation.entities : Object.freeze([]);
      createdSent = true;
      return Object.freeze({ observation, commandResults: Object.freeze(results), renderDelta: Object.freeze({ sessionId: config.sessionId,
        tick: world.tickIndex, created, changed, removed: Object.freeze([]), perceptionEvents: Object.freeze([]) }) });
    },
    observe,
    debugHash(): string {
      assertActive();
      return hashNumbers([config.tickRate, config.mode === 'response-probe' ? 1 : 0, config.probeSpeedWorldPerSecond,
        world.tickIndex, world.previous.xWorld, world.previous.yWorld, world.current.xWorld, world.current.yWorld,
        world.intent.xWorld, world.intent.yWorld, +clearAtP1, expiredSequence, ...world.entities.hashState(), ...cancelled.map(command => command.sequence),
        ...queue.slice().sort((a, b) => a.targetTick - b.targetTick || a.sequence - b.sequence).flatMap(command => [command.targetTick, command.sequence, command.actorRef.index, command.actorRef.generation, command.payload.xWorld, command.payload.yWorld]),
        ...[...history.entries()].sort(([a], [b]) => a - b).flatMap(([sequence, entry]) => {
          const identity = `${entry.fingerprint}/${entry.result.reason ?? ''}`;
          return [sequence, entry.result.tick, entry.result.outcome === 'accepted' ? 1 : entry.result.outcome === 'queued' ? 0 : -1, identity.length, ...[...identity].map(character => character.charCodeAt(0))];
        })]);
    },
    neutralizeInput(): void { if (!disposed) { clearAtP1 = true; cancelled.push(...queue); queue = []; } },
    dispose(): void { if (disposed) return; disposed = true; queue = []; cancelled = []; history.clear(); world.entities.dispose(); }
  });
}

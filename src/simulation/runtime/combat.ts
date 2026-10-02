import type { BattleView } from '../../contracts/index';
import { canonical, dataHash, deepFreeze, integer, SeededRng, tick } from '../../foundation/index';
import { M2_COMMAND_LIMITS, validateProfile } from '../../contracts/index';
import type { CapacityActual, CombatBoundary, CombatConfig, CombatFact, CombatFaultDiagnostic, CombatRuntime, CommandResult, EffectCommand, Observation, RejectReason, TickOutput } from '../../contracts/index';
import { EntityStore } from '../kernel/entity-store';
import { CapacityGuard, CombatFault } from '../kernel/capacity-guard';
import { FactQueue } from '../kernel/fact-queue';
import { createRoster, refresh, snapshot } from './combat-state';
import { executeRoot, sameRef } from './effect-executor';
import type { RootIntent } from './effect-executor';
import { buildDefinitionIndex } from '../kernel/definition-index';
import { RuntimeEntityIndex } from './entity-index';
import { ordered, visits } from '../shared/work';
import { GameplayRuntime } from './gameplay';
import { GameplayIngress } from './gameplay-ingress';
import { parseGameplayCommand } from './gameplay-command';
import { parseEffectCommand } from './combat-command';

/** Private headless runtime. Ordinary port emits no raw entities or combat Facts. */
export function createCombatRuntime(input: CombatConfig, options: { readonly factArchive?: 'full' | 'summary' } = {}): CombatRuntime {
  const config = { ...input };
  const { catalog } = config, r = catalog.document.ruleset, c = catalog.certificate;
  if (config.matchId.length > 96 || config.sessionId.length > 96 || config.roster.length > r.maxUnits) throw new Error('runtime identity/roster envelope');
  if (c.engineVersion !== '0.4.2' || c.compilerVersion !== 'm3-bounded-v2' || c.contentHash !== catalog.contentHash || c.tickRate !== config.tickRate || c.rulesetId !== r.id) throw new Error('catalog/certificate binding');
  let profileReads = 0; const errors = validateProfile(c, config.profile, () => profileReads++); if (errors.length) throw new Error(`profile rejected:${errors.join(',')}`);
  const startup = new CapacityGuard(c, config.profile, 0, 'startup'); startup.scan('maintenance', profileReads); let active: CapacityGuard | null = startup;
  const scan = (kind: Parameters<CapacityGuard['scan']>[0], n: number): void => active?.scan(kind, n);
  const measuredHash = (value: unknown): string => { let count = 0; const result = dataHash(value, n => count += n); active?.charge('structure', count); return result; };
  if (measuredHash({ tickRate: config.tickRate, document: catalog.document }) !== catalog.contentHash) throw new Error('catalog/certificate binding');
  const { id: certificateId, ...certificateData } = c;
  if (measuredHash(certificateData) !== certificateId) throw new Error('certificate integrity');
  const definitions = buildDefinitionIndex(catalog, startup);
  config.roster = input.roster.map(entity => {
    startup.scan('maintenance'); let keys = 0; const base: Record<string, number> = {};
    for (const key in entity.base) {
      if (++keys > catalog.document.attributes.length) throw new Error('base key envelope');
      startup.scan('attribute'); const value = entity.base[key], a = definitions.attributes.get(key, startup);
      if (typeof value !== 'number' || !Number.isFinite(value) || value < a.min || value > a.max) throw new Error(`base envelope:${key}`); base[key] = value;
    }
    return { level: entity.level, base };
  });
  startup.freeze(config, false);
  const store = new EntityStore(config.sessionId); let entities = createRoster(config, store, definitions, scan, startup,catalog.document.gameplay?()=>active?.charge('lookups'):()=>{});
  startup.scan('maintenance', entities.length); const entityIndex = new RuntimeEntityIndex(config.sessionId, store, entities);
  const gameplay = catalog.document.gameplay ? new GameplayRuntime(config, entities, definitions, scan,()=>active?.charge('lookups'),()=>active) : null;
  const gameplayIngress = gameplay ? new GameplayIngress(scan,()=>active?.charge('lookups')) : null;
  let battleView: BattleView | undefined = gameplay ? startup.freeze(gameplay.view()) : undefined;
  const rng = new SeededRng(config.seed), rotation = rng.nextUint32() % r.maxUnits;
  let tickIndex = 0, instanceSequence = 0, operationSequence = 0, eventSequence = 0;
  let lastCommand:CapacityActual|null=null;
  let disposed = false, stepping = false, fault: CombatFaultDiagnostic | null = null;
  let queue: EffectCommand[] = [], cancelled: EffectCommand[] = [], expiredSequence = 0;
  const history = new Map<number, { readonly fingerprint: string; readonly result: CommandResult }>();
  const result = (sequence: number, outcome: CommandResult['outcome'], reason: RejectReason | null): CommandResult => (active ? active.freeze.bind(active) : deepFreeze)({ sequence, outcome, reason, tick: tick(tickIndex) });
  const observe = (): Observation => deepFreeze({ sessionId: config.sessionId, matchId: config.matchId, observer: 'probe-player', team: 0, tick: tick(boundary.tick), entities: [], ...(battleView ? { battle: battleView } : {}) });
  function remember(command: EffectCommand, value: CommandResult): void {
    history.set(command.sequence, { fingerprint: (() => { let count = 0; const value = canonical(command, n => count += n); active?.charge('structure', count); return value; })(), result: value });
    if (history.size > M2_COMMAND_LIMITS.history) {
      scan('scheduler', history.size); const first = ordered([...history.keys()], (a, b) => a - b, scan).find(sequence => { scan('scheduler', 1); return !queue.some(c => { scan('scheduler', 1); return c.sequence === sequence; }) && !cancelled.some(c => { scan('scheduler', 1); return c.sequence === sequence; }); });
      if (first !== undefined) { history.delete(first); expiredSequence = Math.max(expiredSequence, first); }
    }
  }
  function hash(state: unknown): string { return measuredHash({ state, ...(gameplay ? { gameplay: gameplay.state(), ingress: gameplayIngress?.state() } : {}), tickIndex, contentHash: catalog.contentHash, seed: config.seed, rng: rng.snapshot(), instanceSequence, operationSequence, eventSequence, expiredSequence, queue: ordered(queue, (a, b) => a.targetTick - b.targetTick || a.sequence - b.sequence, scan), cancelled: ordered(cancelled, (a, b) => a.sequence - b.sequence, scan), history: ordered((scan('scheduler', history.size), [...history.entries()]), ([a], [b]) => a - b, scan), generations: (scan('maintenance', entities.length), store.hashState()) }); }
  const initialState = entities.map(entity => { startup.scan('maintenance'); return snapshot(catalog, definitions, entity, startup); });
  const initialHash = hash(initialState), initialDelivery = new FactQueue(options.factArchive ?? 'full', config.profile.factQueue).delivery();
  startup.structure({ initialState, initialDelivery });
  let boundary: CombatBoundary = Object.freeze({ tick: 0, entities: initialState, facts: [], factDelivery: initialDelivery, capacity: startup.snapshot(), hash: initialHash });
  active = null;
  const simulation = Object.freeze({
    enqueue(value: unknown): CommandResult {
      const ingress = new CapacityGuard(c, config.profile, tickIndex, 'command', startup.indexes); active = ingress;
      try {
      const gameCommand = gameplay ? parseGameplayCommand(value, n => scan('scheduler',n)) : null;
      if(gameCommand && gameplayIngress) {
        if(disposed || fault)return result(gameCommand.sequence,'rejected',disposed?'disposed':'fault');
        if(gameCommand.matchId!==config.matchId)return result(gameCommand.sequence,'rejected','wrongMatch');
        const spawn=catalog.document.gameplay?.spawns[gameCommand.actorRef.index];
        if(!spawn || spawn.controller!==gameCommand.controllerId)return result(gameCommand.sequence,'rejected','wrongController');
        if(!store.valid({sessionId:config.sessionId,ref:gameCommand.actorRef}))return result(gameCommand.sequence,'rejected','invalidActor');
        return gameplayIngress.enqueue(gameCommand,tickIndex,ingress,result,queue.length+cancelled.length);
      }
      const command = parseEffectCommand(value, scan);
      if (disposed) return result(command?.sequence ?? -1, 'rejected', 'disposed');
      if (fault) return result(command?.sequence ?? -1, 'rejected', 'fault');
      if (!command) return result(-1, 'rejected', 'schema');
      if (command.matchId !== config.matchId) return result(command.sequence, 'rejected', 'wrongMatch');
      const seen = history.get(command.sequence); if (seen) return seen.fingerprint === (() => { let count = 0; const text = canonical(command, n => count += n); ingress.charge('structure', count); return text; })() ? seen.result : result(command.sequence, 'rejected', 'sequenceConflict');
      if (command.sequence <= expiredSequence) return result(command.sequence, 'rejected', 'sequenceExpired');
      let reason: RejectReason | null = null;
      const p = definitions.producers.has(command.producer) ? definitions.producers.get(command.producer, ingress) : null, sameTick = queue.filter(c => { scan('scheduler', 1); return c.targetTick === command.targetTick && c.producer === command.producer; });
      if (!store.valid({ sessionId: config.sessionId, ref: command.actorRef }) || command.targets.some(ref => { scan('query', 1); return !store.valid({ sessionId: config.sessionId, ref }); })) reason = 'invalidActor';
      else if (command.targets.length > r.maxUnits || new Set(command.targets.map(ref => { scan('query', 1); return `${ref.index}:${ref.generation}`; })).size !== command.targets.length) reason = 'targetCapacity';
      else if (!p || p.kind !== 'fixture' || !startup.indexes.producer(p.id)?.allows(command.effect)) reason = 'content';
      else if (sameTick.filter(c => { scan('scheduler', 1); return sameRef(c.actorRef, command.actorRef); }).length >= p.rootsPerInstancePerTick || (new Set(sameTick.map(c => { scan('scheduler', 1); return c.actorRef.index; })).size >= p.maxInstances && !sameTick.some(c => { scan('scheduler', 1); return sameRef(c.actorRef, command.actorRef); }))) reason = 'producerLimit';
      else if (command.targetTick <= tickIndex) reason = 'staleTick';
      else if (command.targetTick > tickIndex + M2_COMMAND_LIMITS.futureTicks) reason = 'futureTick';
      else if (queue.length + cancelled.length + (gameplayIngress?.pending ?? 0) >= M2_COMMAND_LIMITS.pending) reason = 'queueFull';
      const valueResult = result(command.sequence, reason ? 'rejected' : 'queued', reason);
      if (!reason) queue.push(ingress.freeze({ ...command, targets: command.targets }));
      remember(command, valueResult); return valueResult;
      } finally { try{lastCommand=ingress.snapshot();}finally{active = null;} }
    },
    step(): TickOutput {
      if (disposed || fault || stepping) throw new Error(disposed ? 'combat disposed' : fault ? 'combat frozen' : 'reentrant Tick');
      stepping = true; tickIndex = integer(tickIndex + 1, 'tick', 1);
      const guard = new CapacityGuard(c, config.profile, tickIndex, 'tick', startup.indexes), factQueue = new FactQueue(options.factArchive ?? 'full', config.profile.factQueue, n => guard.charge('structure', n)), roots: RootIntent[] = [], results: CommandResult[] = [];
      active = guard;
      const nextInstance = (): number => instanceSequence = integer(instanceSequence + 1, 'instance ID', 1);
      const emit = (fact: Omit<CombatFact, 'eventId' | 'tick' | 'phase'>): void => {
        guard.charge('facts'); eventSequence = integer(eventSequence + 1, 'event ID', 1);
        guard.scan('fact');
        factQueue.push(guard.freeze({ ...fact, eventId: `${config.matchId}:event:${eventSequence}`, tick: tickIndex, phase: guard.phase as CombatFact['phase'] }));
      };
      const maintenance = (kind: string, target: typeof entities[number], before: number, after: number): void => { guard.operation = null; guard.charge('operations'); emit({ kind, operation: null, target: target.ref, before, after, reason: null, breakdown: null }); };
      const scheduled = (producer: typeof r.producers[number], effect: typeof r.producers[number]['effects'][number], source: typeof entities[number]['ref'], target: typeof entities[number]['ref'], instanceId: number): void => {
        guard.charge('lookups'); if (!startup.indexes.producer(producer.id)?.allows(effect)) guard.fault('UNPROVEN_PRODUCER', producer.id);
        roots.push({ rootId: `${config.matchId}:${tickIndex}:${producer.id}:status:${instanceId}`, effect, producer: producer.id, sourceRef: source, targets: [target], sourceSequence: instanceId });
      };
      const run = (root: RootIntent, inherited = false): boolean => {
        const saved = guard.operation;
        if (!inherited) guard.begin(root.rootId, root.effect, root.producer);
        const committed = executeRoot({ catalog, definitions, entityIndex, entities, guard, nextInstance, emit, ...(gameplay ? { gameplay } : {}) }, root, () => operationSequence = integer(operationSequence + 1, 'operation ID', 1));
        if (!inherited) guard.end(); else guard.operation = saved;
        return committed;
      };
      gameplay?.attach({ guard, emit, run, roots });
      try {
        // P0 half-open expiry unregisters Hook/Tag/attribute sources before any combat root.
        for (const entity of visits(entities, scan, 'maintenance')) {
          const statuses = entity.statuses.snapshot();
          for (const status of visits(statuses, scan, 'status')) {
            const d = definitions.modifiers.get(status.definition, guard);
            if (status.endTick <= tickIndex) {
              entity.statuses.remove(status.instanceId); maintenance('ModifierExpired', entity, status.instanceId, 0);
              if (d.end) scheduled(definitions.producers.get(d.end.producer, guard), d.end.effect, status.source, entity.ref, status.instanceId);
            } else if (d.pulse && tickIndex > status.startTick && (tickIndex - status.startTick) % d.pulse.intervalTicks === 0) scheduled(definitions.producers.get(d.pulse.producer, guard), d.pulse.effect, status.source, entity.ref, status.instanceId);
          }
          const shields = entity.vitality.shields();
          for (const shield of visits(shields, scan, 'shield')) if (shield.endTick <= tickIndex) { entity.vitality.expire(shield.instanceId); maintenance('ShieldExpired', entity, shield.remaining, 0); }
          refresh(catalog, definitions, entity, guard);
          for (const resource of visits(catalog.document.resources, scan, 'resource')) {
            // Health regeneration cannot resurrect pending/dead entities. Regeneration retains number fractions.
            if (entity.vitality.life !== 'alive' && resource.id === r.health) continue;
            const change = entity.resources.change(resource.id, resource.regenPerSecond / config.tickRate, 'gain'); maintenance('ResourceRegenerated', entity, change.before, change.after);
          }
        }
        gameplay?.time();
        // P1 fixture commands are launched intentions, not M3 action stages.
        for (const command of visits(cancelled, scan, 'scheduler')) { const value = result(command.sequence, 'rejected', 'inputCleared'); results.push(value); remember(command, value); }
        cancelled = [];
        const commands = ordered(queue.filter(command => { scan('scheduler', 1); return command.targetTick === tickIndex; }),(a, b) => ((a.actorRef.index + rotation + tickIndex) % r.maxUnits) - ((b.actorRef.index + rotation + tickIndex) % r.maxUnits) || a.sequence - b.sequence, scan);
        queue = queue.filter(command => { scan('scheduler', 1); return command.targetTick !== tickIndex; });
        for (const command of visits(commands, scan, 'scheduler')) {
          const source = entityIndex.get({ sessionId: config.sessionId, ref: command.actorRef }, guard);
          const value = result(command.sequence, source?.vitality.life === 'alive' ? 'accepted' : 'rejected', source?.vitality.life === 'alive' ? null : 'invalidActor');
          results.push(value); remember(command, value);
          if (value.outcome === 'accepted') roots.push({ rootId: `${config.matchId}:${tickIndex}:command:${command.sequence}`, effect: command.effect, producer: command.producer, sourceRef: command.actorRef, targets: command.targets, sourceSequence: command.sequence });
        }
        if (gameplay && gameplayIngress) {
          const commands = gameplayIngress.consume(tickIndex,rotation,r.maxUnits,c => { const value=result(c.sequence,'rejected','inputCleared');results.push(value);gameplayIngress.complete(c,value); });
          guard.phase='P2';
          const latestMove=new Map<number,number>();for(const command of visits(commands,scan,'scheduler'))if(command.kind==='move')latestMove.set(command.actorRef.index,command.sequence);
          for(const command of visits(commands,scan,'scheduler')) {const reason=command.kind==='move' && latestMove.get(command.actorRef.index)!==command.sequence ? null : gameplay.command(command);const value=result(command.sequence,reason?'rejected':'accepted',reason);results.push(value);gameplayIngress.complete(command,value);}
          gameplay.actionsPhase();guard.phase='P3';gameplay.movementPhase();guard.phase='P4';gameplay.spatialPhase();
        }
        guard.phase = 'P5';
        const sortedRoots = ordered(roots,(a, b) => ((a.sourceRef.index + rotation + tickIndex) % r.maxUnits) - ((b.sourceRef.index + rotation + tickIndex) % r.maxUnits) || a.sourceRef.index - b.sourceRef.index || a.sourceRef.generation - b.sourceRef.generation || a.sourceSequence - b.sourceSequence || (a.rootId < b.rootId ? -1 : a.rootId > b.rootId ? 1 : 0), scan);
        for (const root of visits(sortedRoots, scan, 'scheduler')) {
          run(root);
        }
        guard.phase = 'P6';
        for (const entity of visits(entities, scan, 'maintenance')) { if (entity.vitality.confirmDeath()) maintenance('EntityDied', entity, entity.vitality.deathSequence - 1, entity.vitality.deathSequence); }
        guard.phase='P7';gameplay?.finish();
        // P7–P8: only the retained Entity kernel structural barrier.
        store.commitStructure(() => scan('maintenance', 1)); guard.phase = 'P9';
        const state = entities.map(entity => { guard.scan('maintenance'); return snapshot(catalog, definitions, entity, guard); });
        battleView = gameplay?.view();
        const facts = factQueue.records(), factDelivery = factQueue.delivery(), stateHash = hash(state);
        guard.structure({ state, facts, factDelivery, results });
        boundary = Object.freeze({ tick: tickIndex, entities: state, facts, factDelivery, capacity: guard.snapshot(), hash: stateHash });
        const observation = observe();
        const output = guard.freeze({ observation, commandResults: results, renderDelta: { sessionId: config.sessionId, tick: tick(tickIndex), created: [], changed: [], removed: [], perceptionEvents: [] } });
        boundary = Object.freeze({ ...boundary, capacity: guard.snapshot() }); return output;
      } catch (error) {
        fault = error instanceof CombatFault ? error.diagnostic : deepFreeze({ code: 'INVARIANT', message: error instanceof Error ? error.message : String(error), tick: tickIndex, phase: guard.phase, rootId: guard.operation?.rootId ?? null, opId: guard.operation?.opId ?? null, producer: guard.operation?.producer ?? null, chain: guard.operation?.chain ?? [], actual: null, certificate: null, limit: null });
        throw new CombatFault(fault);
      } finally { stepping = false; gameplay?.detach(); active = null; }
    },
    observe,
    debugHash(): string { if (disposed) throw new Error('combat disposed'); return boundary.hash; },
    neutralizeInput(): void { if (!disposed && !fault) { cancelled.push(...queue); queue = []; gameplayIngress?.neutralize(); gameplay?.neutralize(); } },
    dispose(): void { battleView=undefined; if (disposed) return; disposed = true; queue = []; cancelled = []; history.clear(); entities = []; entityIndex.clear(); store.dispose(); boundary = deepFreeze({ ...boundary, entities: [], facts: [], factDelivery: { ...boundary.factDelivery, retained: 0 }, hash: 'disposed' }); }
  });
  return Object.freeze({ simulation, debug: Object.freeze({ boundary: () => boundary,commandCapacity:()=>lastCommand, fault: () => fault }) });
}

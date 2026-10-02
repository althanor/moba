import type { MatchId, SessionId } from '../../foundation/index';
import type { EntityRef } from '../components/entity';
import type { CompiledCatalog, ContentId, EngineCapacityProfile, Leaf, Work } from '../content/catalog';
import type { SimulationPort } from '../ports/shell';

export interface CombatConfig {
  readonly matchId: MatchId; readonly sessionId: SessionId; readonly tickRate: number; readonly seed: number;
  readonly catalog: CompiledCatalog; readonly profile: EngineCapacityProfile;
  readonly roster: readonly { readonly level: number; readonly base: Readonly<Record<string, number>> }[];
}
export interface EffectCommand {
  readonly matchId: MatchId; readonly kind: 'debugEffect'; readonly controllerId: 'fixture'; readonly sequence: number;
  readonly targetTick: number; readonly actorRef: EntityRef; readonly producer: ContentId; readonly effect: ContentId;
  readonly targets: readonly EntityRef[];
}
export interface Operation {
  readonly opId: string; readonly rootId: string; readonly parentId: string | null; readonly producer: ContentId;
  readonly effect: ContentId; readonly sourceRef: EntityRef; readonly sourceOwnerRef: EntityRef; readonly targetRef: EntityRef;
  readonly depth: number; readonly chain: readonly string[]; readonly payload: Leaf;
  readonly tags: readonly string[];
}
export interface FormulaStage { readonly stage: string; readonly value: number }
export interface DamageBreakdown {
  readonly rawDamage: number; readonly resolvedDamage: number; readonly shieldAbsorbed: number; readonly hpDamage: number;
  readonly resourceSpent: number; readonly preventedByResource: number; readonly extraHealthDamage: number; readonly overkill: number;
  readonly stages: readonly FormulaStage[]; readonly reasons: readonly string[]; readonly participants: readonly string[];
}
export interface CombatFact {
  readonly eventId: string; readonly tick: number; readonly phase: 'P0' | 'P5' | 'P6'; readonly kind: string;
  readonly operation: Operation | null; readonly target: EntityRef; readonly before: number; readonly after: number;
  readonly reason: string | null; readonly breakdown: DamageBreakdown | null;
}
export interface AttributeTrace {
  readonly id: ContentId; readonly baseGrowthFlat: number; readonly additivePercent: number; readonly multiplied: number;
  readonly overridden: number; readonly converted: number; readonly final: number;
}
export interface ResourceSnapshot { readonly id: ContentId; readonly current: number; readonly maximum: number }
export interface StatusSnapshot {
  readonly instanceId: number; readonly definition: ContentId; readonly source: EntityRef; readonly startTick: number; readonly endTick: number;
}
export interface CombatEntitySnapshot {
  readonly ref: EntityRef; readonly life: 'alive' | 'pendingDeath' | 'dead'; readonly deathSequence: number;
  readonly resources: readonly ResourceSnapshot[]; readonly statuses: readonly StatusSnapshot[];
  readonly shields: readonly { readonly instanceId: number; readonly remaining: number; readonly endTick: number }[];
  readonly attributes: readonly AttributeTrace[]; readonly controlTags: readonly string[];
  readonly capabilities: { readonly canMove: boolean; readonly canBasicAttack: boolean; readonly canCast: boolean; readonly canDisplace: boolean; readonly targetable: boolean };
}
export interface CapacityActual {
  readonly scope: 'tick' | 'startup' | 'command'; readonly scanKinds: Readonly<Record<string, number>>; readonly tick: Work; readonly roots: readonly { readonly rootId: string; readonly effect: ContentId; readonly work: Work }[];
  readonly producers: readonly { readonly id: ContentId; readonly roots: number }[]; readonly rootCount: number;
}
export interface CombatBoundary {
  readonly tick: number; readonly entities: readonly CombatEntitySnapshot[]; readonly facts: readonly CombatFact[];
  readonly capacity: CapacityActual; readonly hash: string;
  readonly factDelivery: FactDelivery;
}
export interface FactDelivery {
  readonly mode: 'full' | 'summary'; readonly produced: number; readonly consumed: number; readonly retained: number;
  readonly queuePeak: number; readonly counts: readonly { readonly kind: string; readonly count: number }[];
}
export interface CombatFaultDiagnostic {
  readonly code: string; readonly message: string; readonly tick: number; readonly phase: string;
  readonly rootId: string | null; readonly opId: string | null; readonly producer: string | null;
  readonly chain: readonly string[]; readonly actual: number | null; readonly certificate: number | null; readonly limit: number | null;
}
export interface CombatDebugPort {
  boundary(): CombatBoundary; fault(): CombatFaultDiagnostic | null;
}
export interface CombatRuntime { readonly simulation: SimulationPort; readonly debug: CombatDebugPort }

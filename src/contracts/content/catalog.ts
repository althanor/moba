import type { Brand } from '../../foundation/index';

export type ContentId = Brand<string, 'ContentId'>;
export type Unit = 'scalar' | 'points';
export type AttributeStage = 'pre' | 'final';
export type Expression =
  | { readonly kind: 'constant'; readonly value: number; readonly unit: Unit }
  | { readonly kind: 'attribute'; readonly id: ContentId; readonly stage: AttributeStage; readonly subject: 'source' | 'target' }
  | { readonly kind: 'add' | 'multiply' | 'divide' | 'min' | 'max'; readonly left: Expression; readonly right: Expression };
export interface FormulaDef { readonly id: ContentId; readonly unit: Unit; readonly expression: Expression }
export interface AttributeDef {
  readonly id: ContentId; readonly unit: Unit; readonly base: number; readonly growthPerLevel: number;
  readonly min: number; readonly max: number; readonly conversion: Expression | null;
}
export interface Contribution {
  readonly attribute: ContentId; readonly bucket: 'flat' | 'percent' | 'multiply' | 'override';
  readonly value: number; readonly priority: number;
}
export type DamageType = 'physical' | 'magic' | 'true';
export type Leaf =
  | { readonly kind: 'damage'; readonly formula: ContentId; readonly damageType: DamageType }
  | { readonly kind: 'heal'; readonly formula: ContentId }
  | { readonly kind: 'shield'; readonly formula: ContentId; readonly durationTicks: number; readonly priority: number; readonly damageTypes: readonly DamageType[] }
  | { readonly kind: 'resource'; readonly resource: ContentId; readonly formula: ContentId; readonly mode: 'spend' | 'gain' }
  | { readonly kind: 'applyStatus' | 'removeStatus'; readonly modifier: ContentId };
export type EffectNode = Leaf
  | { readonly kind: 'sequence'; readonly children: readonly EffectNode[] }
  | { readonly kind: 'repeat'; readonly count: number; readonly child: EffectNode }
  | { readonly kind: 'targets'; readonly selector: 'primary' | 'all' | 'source'; readonly child: EffectNode }
  | { readonly kind: 'conditional'; readonly attribute: ContentId; readonly atLeast: number; readonly yes: EffectNode; readonly no: EffectNode };
export interface EffectDef { readonly id: ContentId; readonly node: EffectNode; readonly tags: readonly string[] }
export interface HookDef {
  readonly id: ContentId; readonly stage: 'pre' | 'post'; readonly match: Leaf['kind']; readonly priority: number;
  readonly maxTriggersPerRootTarget: number;
  readonly action: { readonly kind: 'cancel'; readonly reason: string }
    | { readonly kind: 'scale'; readonly factor: number }
    | { readonly kind: 'replace' | 'derive'; readonly effect: ContentId };
}
export interface ModifierDef {
  readonly id: ContentId; readonly durationTicks: number; readonly maxInstancesPerEntity: number;
  readonly contributions: readonly Contribution[]; readonly tags: readonly string[]; readonly hooks: readonly HookDef[];
  readonly control: 'none' | 'stun' | 'silence' | 'disarm'; readonly deathSaveHealth: number | null;
  readonly pulse: { readonly intervalTicks: number; readonly effect: ContentId; readonly producer: ContentId } | null;
  readonly end: { readonly effect: ContentId; readonly producer: ContentId } | null;
}
export interface ResourceDef {
  readonly id: ContentId; readonly maximumAttribute: ContentId; readonly initial: number; readonly regenPerSecond: number;
}
export interface ProducerDef {
  readonly id: ContentId; readonly kind: 'fixture' | 'statusPulse' | 'statusEnd';
  readonly maxInstances: number; readonly rootsPerInstancePerTick: number; readonly effects: readonly ContentId[];
}
export interface RulesetDef {
  readonly id: ContentId; readonly maxUnits: number; readonly queryCapacity: number;
  readonly maxStatusesPerEntity: number; readonly maxStatusesGlobal: number; readonly maxShieldsPerEntity: number;
  readonly maxHookDepth: number; readonly health: ContentId; readonly armor: ContentId; readonly magicResistance: ContentId;
  readonly producers: readonly ProducerDef[];
}
export interface ContentDocument {
  readonly schemaVersion: 1; readonly attributes: readonly AttributeDef[]; readonly formulas: readonly FormulaDef[];
  readonly resources: readonly ResourceDef[]; readonly modifiers: readonly ModifierDef[];
  readonly effects: readonly EffectDef[]; readonly ruleset: RulesetDef;
}
export const WORK_KEYS = ['operations', 'hooks', 'queries', 'ast', 'formula', 'scans', 'facts', 'lookups', 'structure'] as const;
export type WorkKey = typeof WORK_KEYS[number];
export type Work = Readonly<Record<WorkKey, number>>;
export interface RootCertificate {
  readonly effect: ContentId; readonly work: Work; readonly limit: Work; readonly maxPrimaryTargets: number;
  readonly F_e: number; readonly B_e: number; readonly R_e: number; readonly D_e: number; readonly S_e: number;
  readonly fanoutSegments: readonly { readonly path: string; readonly selector: string; readonly maximumTargets: number }[];
}
export interface ProducerCertificate {
  readonly id: ContentId; readonly maxRoots: number; readonly work: Work;
  readonly provenEffects: readonly ContentId[]; readonly kind: ProducerDef['kind']; readonly maxInstances: number; readonly rootsPerInstancePerTick: number;
}
export interface CapacityCertificate {
  readonly id: string; readonly engineVersion: string; readonly compilerVersion: string; readonly contentHash: string;
  readonly tickRate: number; readonly rulesetId: ContentId; readonly roots: readonly RootCertificate[];
  readonly producers: readonly ProducerCertificate[]; readonly maintenance: Work;
  readonly maintenanceEnvelope: { readonly modifierEvents: number; readonly shieldEvents: number; readonly resourceUpdates: number; readonly deathEvents: number };
  readonly tick: Work; readonly limit: Work; readonly rootCount: number; readonly rootCountLimit: number;
  readonly maxHookDepth: number; readonly maxUnits: number; readonly maxStatusesGlobal: number;
  readonly factQueue: number; readonly factQueueLimit: number;
  readonly startup: Work; readonly startupLimit: Work; readonly command: Work; readonly commandLimit: Work;
  readonly scanModel: { readonly version: string; readonly attributePass: number; readonly leafPass: number; readonly maintenancePass: number; readonly factStructure: number; readonly maxStringLength: number };
}
export interface EngineCapacityProfile {
  readonly id: string; readonly capacity: Work; readonly roots: number; readonly queryTargets: number;
  readonly hookDepth: number; readonly units: number; readonly statuses: number;
  readonly factQueue: number; readonly startup: Work; readonly command: Work;
}
export interface CompiledCatalog {
  readonly document: ContentDocument; readonly contentHash: string;
  readonly attributeOrder: readonly ContentId[]; readonly certificate: CapacityCertificate;
  readonly boundedTriggerCycles: readonly { readonly path: readonly string[]; readonly maxHookDepth: number }[];
}
export interface Diagnostic { readonly code: string; readonly path: string; readonly message: string }
export type CompileResult = { readonly ok: true; readonly catalog: CompiledCatalog } | { readonly ok: false; readonly diagnostics: readonly Diagnostic[] };

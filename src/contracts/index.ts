export type { EntityRef, ScopedEntityRef, MotionSample } from './components/entity';
export type { ProbeCommand, CommandResult, RejectReason } from './commands/probe';
export type { Observation, RenderDelta, PerceptionEvent } from './observations/shell';
export type { ShellConfig, TickOutput, SimulationPort, CommandSink, ObservationSource, CheckpointCodec, PauseReason, SessionState, RawInput, ControllerInput, ProbeMode, DebugSnapshot, PresentationFrame, DebugAction, PresentationHost } from './ports/shell';
export * from './content/catalog';
export { zeroWork, addWork, scaleWork, maxWork, limitWork, M2_COMMAND_LIMITS } from './content/work';
export { validateProfile } from './content/profile';
export type { CombatConfig, EffectCommand, Operation, FormulaStage, DamageBreakdown, CombatFact, AttributeTrace, ResourceSnapshot, StatusSnapshot, CombatEntitySnapshot, CapacityActual, CombatBoundary, CombatFaultDiagnostic, CombatDebugPort, CombatRuntime, FactDelivery } from './events/combat';

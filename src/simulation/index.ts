export { createSimulation } from './runtime/shell';
export { createCombatRuntime } from './runtime/combat';
export { calculateAttributes } from './features/attributes/evaluate';
export { resistanceMultiplier, effectiveResistance, cooldownSeconds } from './shared/formulas/registry';

export { SpatialGrid } from './shared/queries/grid';
export type { SpatialUnit, SpatialHit, SpatialShape } from './shared/queries/grid';

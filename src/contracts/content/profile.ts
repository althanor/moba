import { WORK_KEYS } from './catalog';
import type { CapacityCertificate, EngineCapacityProfile } from './catalog';

export function validateProfile(c: CapacityCertificate, p: EngineCapacityProfile, visit: () => void = () => {}): readonly string[] {
  const errors: string[] = [];
  for (const scope of ['startup', 'command'] as const) for (const key of WORK_KEYS) if (!Number.isSafeInteger(p[scope]?.[key]) || p[scope][key] < c[scope === 'startup' ? 'startupLimit' : 'commandLimit'][key]) errors.push(`profile.${scope}.${key}`);
  for (const key of WORK_KEYS) if (!Number.isSafeInteger(p.capacity[key]) || p.capacity[key] < c.limit[key] || c.roots.some(root => { visit(); return p.capacity[key] < root.limit[key]; })) errors.push(`profile.capacity.${key}`);
  for (const [key, required, actual] of [['roots', c.rootCountLimit, p.roots], ['queryTargets', c.maxUnits, p.queryTargets], ['hookDepth', c.maxHookDepth, p.hookDepth], ['units', c.maxUnits, p.units], ['statuses', c.maxStatusesGlobal, p.statuses], ['factQueue', c.factQueueLimit, p.factQueue]] as const) if (!Number.isSafeInteger(actual) || actual < required) errors.push(`profile.${key}`);
  return errors;
}

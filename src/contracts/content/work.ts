import { checkedAdd, checkedMultiply, powerOfTwo } from '../../foundation/index';
import { WORK_KEYS } from './catalog';
import type { Work } from './catalog';
export function zeroWork(): Work { return { operations: 0, hooks: 0, queries: 0, ast: 0, formula: 0, scans: 0, facts: 0, lookups: 0, structure: 0 }; }
function combine(a: Work, fn: (value: number, key: keyof Work) => number): Work {
  const result = { ...a }; for (const key of WORK_KEYS) result[key] = fn(a[key], key); return result;
}
export function addWork(a: Work, b: Work): Work { return combine(a, (v, k) => checkedAdd(v, b[k])); }
export function scaleWork(a: Work, n: number): Work { return combine(a, v => checkedMultiply(v, n)); }
export function maxWork(a: Work, b: Work): Work { return combine(a, (v, k) => Math.max(v, b[k])); }
export function limitWork(a: Work): Work { return combine(a, v => powerOfTwo(v)); }

// Retained M1 command envelopes; compiler and M2 entrance share one source.
export const M2_COMMAND_LIMITS = Object.freeze({ targets: 512, pending: 512, history: 512, futureTicks: 90 });

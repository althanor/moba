import { stableMergeSort } from '../../foundation/index';
/** One scan unit is one element read in a semantic collection pass. */
export type ScanKind = 'status' | 'hook' | 'shield' | 'resource' | 'query' | 'attribute' | 'diagnostic' | 'maintenance' | 'ordering' | 'fact' | 'scheduler' | 'action' | 'movement' | 'spatial' | 'projectile' | 'area';
export type Scan = (kind: ScanKind, count: number) => void;
export const noScan: Scan = () => {};
export function* visits<T>(items: readonly T[], scan: Scan, kind: ScanKind): Generator<T> {
  for (const item of items) { scan(kind, 1); yield item; }
}
/** Stable merge sort: n copy reads + at most 2n reads per merge level. */
export function ordered<T>(items: readonly T[], compare: (a: T, b: T) => number, scan: Scan): T[] {
  return stableMergeSort(items, compare, n => scan('ordering', n));
}

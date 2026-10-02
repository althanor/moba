import { stableMergeSort } from './order';
function integer(value: number, label: string): number {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError(`${label} invalid`);
  return value;
}

export function checkedAdd(a: number, b: number): number { return integer(a + b, 'capacity sum'); }
export function checkedMultiply(a: number, b: number): number { return integer(a * b, 'capacity product'); }
export function powerOfTwo(value: number): number {
  integer(value, 'capacity'); let result = 1;
  while (result < value) result = checkedMultiply(result, 2);
  return result;
}
export function deepFreeze<T>(value: T, visit?: (count: number) => void, reuseFrozen = true): Readonly<T> {
  visit?.(1);
  if (value !== null && typeof value === 'object') {
    if (visit && reuseFrozen && Object.isFrozen(value)) return value;
    const children = Object.values(value); visit?.(children.length);
    for (const child of children) deepFreeze(child, visit, reuseFrozen);
    Object.freeze(value);
  }
  return value;
}
export function canonical(value: unknown, visit?: (count: number) => void): string {
  visit?.(1);
  if (Array.isArray(value)) return `[${value.map(child => canonical(child, visit)).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value); visit?.(entries.length);
    return `{${stableMergeSort(entries, ([a], [b]) => a < b ? -1 : a > b ? 1 : 0, visit).map(([key, child]) => { visit?.(key.length + 1); return `${JSON.stringify(key)}:${canonical(child, visit)}`; }).join(',')}}`;
  }
  const text = JSON.stringify(value);
  if (text === undefined) throw new Error('non-serializable value');
  visit?.(text.length);
  return text;
}
export function dataHash(value: unknown, visit?: (count: number) => void): string {
  const text = canonical(value, visit); visit?.(text.length); let result = 2166136261;
  for (let i = 0; i < text.length; i++) result = Math.imul(result ^ text.charCodeAt(i), 16777619);
  return (result >>> 0).toString(16).padStart(8, '0');
}
export function compareId(a: string, b: string): number { return a < b ? -1 : a > b ? 1 : 0; }

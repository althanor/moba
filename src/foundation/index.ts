export type Brand<T, Name extends string> = T & { readonly __brand: Name };
export type TickIndex = Brand<number, 'TickIndex'>;
export type SessionId = Brand<string, 'SessionId'>;
export type MatchId = Brand<string, 'MatchId'>;
import type { Vec2 } from './vector';
export type { Vec2 } from './vector';

export function finite(value: number, label: string): number {
  if (!Number.isFinite(value)) throw new RangeError(`${label} must be finite`);
  return value;
}
export function integer(value: number, label: string, min = 0): number {
  if (!Number.isSafeInteger(value) || value < min) throw new RangeError(`${label} invalid`);
  return value;
}
export function tick(value: number): TickIndex { return integer(value, 'tick') as TickIndex; }
export function sessionId(value: string): SessionId {
  if (!value) throw new RangeError('empty sessionId');
  return value as SessionId;
}
export function matchId(value: string): MatchId {
  if (!value) throw new RangeError('empty matchId');
  return value as MatchId;
}
export function durationTicks(durationMs: number, tickRate: number): number {
  finite(durationMs, 'durationMs'); integer(tickRate, 'tickRate', 1);
  if (durationMs < 0) throw new RangeError('negative duration');
  return integer(Math.ceil(durationMs * tickRate / 1000), 'durationTicks');
}
export function direction(xWorld: number, yWorld: number): Vec2 {
  finite(xWorld, 'xWorld'); finite(yWorld, 'yWorld');
  const length = Math.hypot(xWorld, yWorld);
  const divisor = Math.max(1, length);
  return Object.freeze({ xWorld: xWorld / divisor, yWorld: yWorld / divisor });
}
// Canonical numeric-array hashing for M1 diagnostics; not a cryptographic checksum.
export function hashNumbers(values: readonly number[]): string {
  const text = values.map(value => String(finite(value, 'hash input'))).join('|');
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return (hash >>> 0).toString(16).padStart(8, '0');
}
export class SeededRng {
  #state: number;
  constructor(seed: number) { this.#state = integer(seed, 'seed', 1) >>> 0; if (!this.#state) throw new RangeError('zero seed'); }
  nextUint32(): number {
    let value = this.#state;
    value ^= value << 13; value ^= value >>> 17; value ^= value << 5;
    this.#state = value >>> 0;
    return this.#state;
  }
  snapshot(): Readonly<{ version: 'xorshift32-v1'; state: number }> {
    return Object.freeze({ version: 'xorshift32-v1', state: this.#state });
  }
}
export class RingBuffer<T> {
  #items: T[] = [];
  #cursor = 0;
  constructor(readonly capacity: number) { integer(capacity, 'capacity', 1); }
  push(item: T): void {
    if (this.#items.length < this.capacity) this.#items.push(item);
    else { this.#items[this.#cursor] = item; this.#cursor = (this.#cursor + 1) % this.capacity; }
  }
  values(): readonly T[] { return [...this.#items.slice(this.#cursor), ...this.#items.slice(0, this.#cursor)]; }
  clear(): void { this.#items = []; this.#cursor = 0; }
  get size(): number { return this.#items.length; }
}
export { checkedAdd, checkedMultiply, powerOfTwo, deepFreeze, canonical, dataHash, compareId } from './data';

export { stableMergeSort } from './order';

export { circleTOI, rectTOI, movementCircleTOI, movementRectTOI, distance, unit, along, subtract, lengthSquared } from './geometry';
export { touchLayout } from './touch-layout';
export { cssVectorToWorld, cssPointToWorld } from './screen-space';
export type { CssVector } from './screen-space';

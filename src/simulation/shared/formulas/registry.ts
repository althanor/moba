import { finite } from '../../../foundation/index';
import type { ContentId, Expression } from '../../../contracts/index';

export interface FormulaReader { read(id: ContentId, stage: 'pre' | 'final', subject: 'source' | 'target'): number }
export function evaluateExpression(expr: Expression, reader: FormulaReader, visit: () => void, path: string, record?: (path: string, value: number) => void): number {
  visit();
  let value: number;
  if (expr.kind === 'constant') value = finite(expr.value, path);
  else if (expr.kind === 'attribute') value = finite(reader.read(expr.id, expr.stage, expr.subject), `${path}:${expr.id}`);
  else {
    const left = evaluateExpression(expr.left, reader, visit, `${path}.left`, record), right = evaluateExpression(expr.right, reader, visit, `${path}.right`, record);
    switch (expr.kind) {
      case 'add': value = finite(left + right, path); break;
      case 'multiply': value = finite(left * right, path); break;
      case 'divide': if (right === 0) throw new RangeError(`${path}:divide_zero`); value = finite(left / right, path); break;
      case 'min': value = Math.min(left, right); break;
      case 'max': value = Math.max(left, right); break;
    }
  }
  record?.(path, value); return value;
}
export function resistanceMultiplier(resistance: number): number {
  finite(resistance, 'resistance'); return resistance >= 0 ? 100 / (100 + resistance) : 2 - 100 / (100 - resistance);
}
export function effectiveResistance(base: number, flatReduction: number, percentReduction: number, percentPenetration: readonly number[], flatPenetration: number): number {
  for (const p of [percentReduction, ...percentPenetration]) if (!Number.isFinite(p) || p < 0 || p > 1) throw new RangeError('percent penetration/reduction range');
  for (const f of [flatReduction, flatPenetration]) if (!Number.isFinite(f) || f < 0) throw new RangeError('flat reduction/penetration range');
  const reduced = finite((base - flatReduction) * (1 - percentReduction), 'reduced resistance');
  return reduced <= 0 ? reduced : Math.max(0, reduced * percentPenetration.reduce((n, p) => n * (1 - p), 1) - flatPenetration);
}
export function cooldownSeconds(base: number, haste: number): number {
  if (!Number.isFinite(base) || base < 0 || !Number.isFinite(haste) || haste <= -100) throw new RangeError('cooldown range');
  return finite(base / (1 + haste / 100), 'cooldown');
}

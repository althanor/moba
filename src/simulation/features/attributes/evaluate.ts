import { compareId, finite } from '../../../foundation/index';
import type { AttributeTrace, CompiledCatalog, ContentId, Contribution } from '../../../contracts/index';
import { DefinitionIndex } from '../../kernel/definition-index';
import { evaluateExpression } from '../../shared/formulas/registry';
import { ordered, visits } from '../../shared/work';

export interface SourcedContribution { readonly definition: ContentId; readonly instanceId: number; readonly contribution: Contribution }
export class AttributeCache {
  #version = -1; #values: readonly AttributeTrace[] = []; #index = new Map<ContentId, AttributeTrace>();
  get(version: number): readonly AttributeTrace[] | null { return this.#version === version ? this.#values : null; }
  read(id: ContentId): AttributeTrace { const value = this.#index.get(id); if (!value) throw new Error(`attribute:${id}`); return value; }
  update(version: number, values: readonly AttributeTrace[]): readonly AttributeTrace[] { this.#version = version; this.#values = values; this.#index = new Map(values.map(v => [v.id, v])); return values; }
}
export function calculateAttributes(catalog: CompiledCatalog, level: number, base: Readonly<Record<string, number>>, contributions: readonly SourcedContribution[], charge: (kind: 'formula' | 'scans' | 'lookups', n: number) => void, definitions = new DefinitionIndex(catalog.document.attributes, () => charge('scans', 1))): readonly AttributeTrace[] {
  const values = new Map<ContentId, AttributeTrace>(), scan = (_kind: string, n: number): void => charge('scans', n);
  const sorted = ordered(contributions, (a, b) => b.contribution.priority - a.contribution.priority || compareId(a.definition, b.definition) || a.instanceId - b.instanceId || compareId(a.contribution.bucket, b.contribution.bucket) || a.contribution.value - b.contribution.value, scan);
  for (const a of visits(catalog.document.attributes, scan, 'attribute')) {
    let flat = 0, percent = 0; const factors: number[] = []; let override: number | null = null;
    for (const c of visits(sorted, scan, 'attribute')) if (c.contribution.attribute === a.id) {
      const item = c.contribution;
      if (item.bucket === 'flat') flat += item.value;
      else if (item.bucket === 'percent') percent += item.value;
      else if (item.bucket === 'multiply') factors.push(item.value);
      else if (override === null) override = item.value;
    }
    const baseGrowthFlat = finite((base[a.id] ?? a.base) + a.growthPerLevel * (level - 1) + flat, a.id);
    const additivePercent = finite(baseGrowthFlat * (1 + percent), a.id); let multiplied = additivePercent;
    for (const factor of visits(factors, scan, 'attribute')) multiplied = finite(multiplied * factor, a.id); const overridden = override ?? multiplied;
    values.set(a.id, { id: a.id, baseGrowthFlat, additivePercent, multiplied, overridden, converted: overridden, final: overridden });
  }
  for (const id of visits(catalog.attributeOrder, scan, 'attribute')) {
    charge('lookups', 2); const a = definitions.get(id), trace = values.get(id); if (!trace) throw new Error(`attribute missing:${id}`);
    const conversion = a.conversion ? evaluateExpression(a.conversion, { read(readId, stage) { charge('lookups', 1); const t = values.get(readId); if (!t) throw new Error(`attribute:${readId}`); return stage === 'pre' ? t.overridden : t.final; } }, () => charge('formula', 1), `attribute:${id}`) : 0;
    const converted = finite(trace.overridden + conversion, id), final = Math.min(a.max, Math.max(a.min, converted)); values.set(id, { ...trace, converted, final });
  }
  const output: AttributeTrace[] = [];
  for (const a of visits(catalog.document.attributes, scan, 'attribute')) { charge('lookups', 1); const value = values.get(a.id); if (!value) throw new Error('attribute trace'); output.push(value); }
  return output;
}

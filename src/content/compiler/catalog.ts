import { compareId, dataHash, deepFreeze, integer } from '../../foundation/index';
import type { CompileResult } from '../../contracts/index';
import { ContentError, parseDocument } from '../validation/schema';
import { boundedTriggerCycles, validateGraphs } from './graphs';
import { proveCapacity } from './capacity';

export function compileContent(value: unknown, tickRate: number): CompileResult {
  try {
    integer(tickRate, 'tickRate', 1);
    const parsed = parseDocument(value, tickRate);
    const sort = <T extends { readonly id: string }>(items: readonly T[]): T[] => items.slice().sort((a, b) => compareId(a.id, b.id));
    const document = { ...parsed, attributes: sort(parsed.attributes), formulas: sort(parsed.formulas), resources: sort(parsed.resources), effects: sort(parsed.effects), modifiers: sort(parsed.modifiers).map(m => ({ ...m, hooks: sort(m.hooks) })), ruleset: { ...parsed.ruleset, producers: sort(parsed.ruleset.producers) } };
    const attributeOrder = validateGraphs(document);
    const contentHash = dataHash({ tickRate, document });
    const certificate = proveCapacity(document, contentHash, tickRate);
    return deepFreeze({ ok: true, catalog: { document, contentHash, attributeOrder, certificate, boundedTriggerCycles: boundedTriggerCycles(document) } });
  } catch (error) {
    return { ok: false, diagnostics: [{ code: error instanceof ContentError ? error.code : 'FINITE_BOUND', path: error instanceof ContentError ? error.path : '$', message: error instanceof Error ? error.message : String(error) }] };
  }
}

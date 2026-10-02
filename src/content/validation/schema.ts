import { durationTicks, finite, integer } from '../../foundation/index';
import type { AttributeDef, ContentDocument, ContentId, Contribution, DamageType, EffectNode, EngineCapacityProfile, Expression, FormulaDef, HookDef, ModifierDef, ProducerDef, ResourceDef, RulesetDef, Unit, Work } from '../../contracts/index';

export class ContentError extends Error {
  constructor(readonly code: string, readonly path: string, message: string) { super(message); }
}
function fail(path: string, message: string): never { throw new ContentError('SCHEMA', path, message); }
function object(value: unknown, path: string, keys: readonly string[]): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fail(path, 'expected object');
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (!keys.includes(key)) fail(`${path}.${key}`, 'unsupported field'); result[key] = child;
  }
  return result;
}
function list<T>(value: unknown, path: string, parse: (value: unknown, path: string) => T): T[] {
  if (!Array.isArray(value) || value.length > 4096) return fail(path, 'expected bounded array <=4096');
  return value.map((child: unknown, i: number) => parse(child, `${path}[${i}]`));
}
function text(value: unknown, path: string): string {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_.:-]{1,96}$/.test(value)) return fail(path, 'expected stable identifier'); return value;
}
function id(value: unknown, path: string): ContentId { return text(value, path) as ContentId; }
function number(value: unknown, path: string, min = -Number.MAX_VALUE, max = Number.MAX_VALUE): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) return fail(path, `expected finite number in [${min},${max}]`); return value;
}
function count(value: unknown, path: string, min = 0, max = Number.MAX_SAFE_INTEGER): number { return integer(number(value, path, min, max), path, min); }
function choice<T extends string>(value: unknown, path: string, options: readonly T[]): T {
  for (const option of options) if (value === option) return option; return fail(path, `expected ${options.join('|')}`);
}
const units: readonly Unit[] = ['scalar', 'points'];
function expression(value: unknown, path: string, depth = 0): Expression {
  if (depth > 16) fail(path, 'expression exceeds depth 16');
  const o = object(value, path, ['kind', 'value', 'unit', 'id', 'stage', 'subject', 'left', 'right']);
  const kind = choice(o['kind'], `${path}.kind`, ['constant', 'attribute', 'add', 'multiply', 'divide', 'min', 'max']);
  object(value, path, kind === 'constant' ? ['kind', 'value', 'unit'] : kind === 'attribute' ? ['kind', 'id', 'stage', 'subject'] : ['kind', 'left', 'right']);
  if (kind === 'constant') return { kind, value: number(o['value'], path), unit: choice(o['unit'], path, units) };
  if (kind === 'attribute') return { kind, id: id(o['id'], path), stage: choice(o['stage'], path, ['pre', 'final']), subject: choice(o['subject'], path, ['source', 'target']) };
  return { kind, left: expression(o['left'], `${path}.left`, depth + 1), right: expression(o['right'], `${path}.right`, depth + 1) };
}
function effectNode(value: unknown, path: string, tickRate: number, depth = 0): EffectNode {
  if (depth > 16) fail(path, 'Effect exceeds depth 16');
  const o = object(value, path, ['kind', 'formula', 'damageType', 'resource', 'mode', 'modifier', 'children', 'count', 'child', 'selector', 'attribute', 'atLeast', 'yes', 'no', 'durationMs', 'priority', 'damageTypes']);
  const kind = choice(o['kind'], path, ['damage', 'heal', 'shield', 'resource', 'applyStatus', 'removeStatus', 'sequence', 'repeat', 'targets', 'conditional']);
  const fields: Record<typeof kind, readonly string[]> = { damage: ['kind', 'formula', 'damageType'], heal: ['kind', 'formula'], shield: ['kind', 'formula', 'durationMs', 'priority', 'damageTypes'], resource: ['kind', 'resource', 'formula', 'mode'], applyStatus: ['kind', 'modifier'], removeStatus: ['kind', 'modifier'], sequence: ['kind', 'children'], repeat: ['kind', 'count', 'child'], targets: ['kind', 'selector', 'child'], conditional: ['kind', 'attribute', 'atLeast', 'yes', 'no'] };
  object(value, path, fields[kind]);
  switch (kind) {
    case 'damage': return { kind, formula: id(o['formula'], path), damageType: choice(o['damageType'], path, ['physical', 'magic', 'true']) };
    case 'heal': return { kind, formula: id(o['formula'], path) };
    case 'shield': return { kind, formula: id(o['formula'], path), durationTicks: integer(durationTicks(number(o['durationMs'], path, 0), tickRate), path, 1), priority: number(o['priority'], path), damageTypes: list<DamageType>(o['damageTypes'], path, (v, p) => choice(v, p, ['physical', 'magic', 'true'])) };
    case 'resource': return { kind, formula: id(o['formula'], path), resource: id(o['resource'], path), mode: choice(o['mode'], path, ['spend', 'gain']) };
    case 'applyStatus': case 'removeStatus': return { kind, modifier: id(o['modifier'], path) };
    case 'sequence': return { kind, children: list(o['children'], path, (child, p) => effectNode(child, p, tickRate, depth + 1)) };
    case 'repeat': return { kind, count: count(o['count'], path, 0, 4096), child: effectNode(o['child'], `${path}.child`, tickRate, depth + 1) };
    case 'targets': return { kind, selector: choice(o['selector'], path, ['primary', 'all', 'source']), child: effectNode(o['child'], `${path}.child`, tickRate, depth + 1) };
    case 'conditional': return { kind, attribute: id(o['attribute'], path), atLeast: number(o['atLeast'], path), yes: effectNode(o['yes'], `${path}.yes`, tickRate, depth + 1), no: effectNode(o['no'], `${path}.no`, tickRate, depth + 1) };
  }
}
function contribution(value: unknown, path: string): Contribution {
  const o = object(value, path, ['attribute', 'bucket', 'value', 'priority']);
  const bucket = choice(o['bucket'], path, ['flat', 'percent', 'multiply', 'override']);
  return { attribute: id(o['attribute'], path), bucket, value: number(o['value'], path, bucket === 'multiply' ? 0 : -Number.MAX_VALUE), priority: number(o['priority'], path) };
}
function hook(value: unknown, path: string): HookDef {
  const o = object(value, path, ['id', 'stage', 'match', 'priority', 'maxTriggersPerRootTarget', 'action']);
  const a = object(o['action'], `${path}.action`, ['kind', 'reason', 'factor', 'effect']);
  const kind = choice(a['kind'], path, ['cancel', 'scale', 'replace', 'derive']);
  object(o['action'], `${path}.action`, kind === 'cancel' ? ['kind', 'reason'] : kind === 'scale' ? ['kind', 'factor'] : ['kind', 'effect']);
  const action: HookDef['action'] = kind === 'cancel' ? { kind, reason: text(a['reason'], path) } : kind === 'scale' ? { kind, factor: number(a['factor'], path, 0) } : { kind, effect: id(a['effect'], path) };
  const stage = choice(o['stage'], path, ['pre', 'post']);
  if ((stage === 'post') !== (kind === 'derive')) fail(path, 'post may only derive; pre cannot derive');
  const match = choice(o['match'], path, ['damage', 'heal', 'shield', 'resource', 'applyStatus', 'removeStatus']);
  if (kind === 'scale' && !['damage', 'heal', 'shield', 'resource'].includes(match)) fail(path, 'scale requires numeric Operation');
  return { id: id(o['id'], path), stage, match, priority: number(o['priority'], path), maxTriggersPerRootTarget: count(o['maxTriggersPerRootTarget'], path, 1), action };
}
export function parseDocument(value: unknown, tickRate: number): ContentDocument {
  const o = object(value, '$', ['schemaVersion', 'attributes', 'formulas', 'resources', 'modifiers', 'effects', 'ruleset']);
  if (o['schemaVersion'] !== 1) fail('$.schemaVersion', 'requires version 1');
  const attributes = list<AttributeDef>(o['attributes'], '$.attributes', (v, p) => {
    const a = object(v, p, ['id', 'unit', 'base', 'growthPerLevel', 'min', 'max', 'conversion']);
    const min = number(a['min'], p), max = number(a['max'], p); if (max < min) fail(p, 'inverted clamp');
    return { id: id(a['id'], p), unit: choice(a['unit'], p, units), base: number(a['base'], p), growthPerLevel: number(a['growthPerLevel'], p), min, max, conversion: a['conversion'] === null ? null : expression(a['conversion'], `${p}.conversion`) };
  });
  const formulas = list<FormulaDef>(o['formulas'], '$.formulas', (v, p) => { const a = object(v, p, ['id', 'unit', 'expression']); return { id: id(a['id'], p), unit: choice(a['unit'], p, units), expression: expression(a['expression'], `${p}.expression`) }; });
  const resources = list<ResourceDef>(o['resources'], '$.resources', (v, p) => { const a = object(v, p, ['id', 'maximumAttribute', 'initial', 'regenPerSecond']); return { id: id(a['id'], p), maximumAttribute: id(a['maximumAttribute'], p), initial: number(a['initial'], p, 0), regenPerSecond: number(a['regenPerSecond'], p, 0) }; });
  const modifiers = list<ModifierDef>(o['modifiers'], '$.modifiers', (v, p) => {
    const a = object(v, p, ['id', 'durationMs', 'maxInstancesPerEntity', 'contributions', 'tags', 'hooks', 'control', 'deathSaveHealth', 'pulse', 'end']);
    const pulse = a['pulse'] === null ? null : object(a['pulse'], `${p}.pulse`, ['intervalMs', 'effect', 'producer']);
    const end = a['end'] === null ? null : object(a['end'], `${p}.end`, ['effect', 'producer']);
    return { id: id(a['id'], p), durationTicks: integer(durationTicks(number(a['durationMs'], p, 0), tickRate), p, 1), maxInstancesPerEntity: count(a['maxInstancesPerEntity'], p, 1, 64), contributions: list(a['contributions'], p, contribution), tags: list(a['tags'], p, text), hooks: list(a['hooks'], p, hook), control: choice(a['control'], p, ['none', 'stun', 'silence', 'disarm']), deathSaveHealth: a['deathSaveHealth'] === null ? null : number(a['deathSaveHealth'], p, Number.MIN_VALUE), pulse: pulse && { intervalTicks: integer(durationTicks(number(pulse['intervalMs'], p, 0), tickRate), p, 1), effect: id(pulse['effect'], p), producer: id(pulse['producer'], p) }, end: end && { effect: id(end['effect'], p), producer: id(end['producer'], p) } };
  });
  const effects = list(o['effects'], '$.effects', (v, p) => { const a = object(v, p, ['id', 'node', 'tags']); return { id: id(a['id'], p), node: effectNode(a['node'], `${p}.node`, tickRate), tags: a['tags'] === undefined ? [] : list(a['tags'], `${p}.tags`, text) }; });
  const r = object(o['ruleset'], '$.ruleset', ['id', 'maxUnits', 'queryCapacity', 'maxStatusesPerEntity', 'maxStatusesGlobal', 'maxShieldsPerEntity', 'maxHookDepth', 'health', 'armor', 'magicResistance', 'producers']);
  const producers = list<ProducerDef>(r['producers'], '$.ruleset.producers', (v, p) => { const a = object(v, p, ['id', 'kind', 'maxInstances', 'rootsPerInstancePerTick', 'effects']); return { id: id(a['id'], p), kind: choice(a['kind'], p, ['fixture', 'statusPulse', 'statusEnd']), maxInstances: count(a['maxInstances'], p, 1), rootsPerInstancePerTick: count(a['rootsPerInstancePerTick'], p, 1), effects: list(a['effects'], p, id) }; });
  const ruleset: RulesetDef = { id: id(r['id'], '$.ruleset'), maxUnits: count(r['maxUnits'], '$.ruleset.maxUnits', 1, 454), queryCapacity: count(r['queryCapacity'], '$.ruleset.queryCapacity', 1, 512), maxStatusesPerEntity: count(r['maxStatusesPerEntity'], '$.ruleset', 0, 64), maxStatusesGlobal: count(r['maxStatusesGlobal'], '$.ruleset', 0, 4096), maxShieldsPerEntity: count(r['maxShieldsPerEntity'], '$.ruleset', 0, 64), maxHookDepth: count(r['maxHookDepth'], '$.ruleset', 0, 8), health: id(r['health'], '$.ruleset'), armor: id(r['armor'], '$.ruleset'), magicResistance: id(r['magicResistance'], '$.ruleset'), producers };
  finite(tickRate, 'tick rate');
  return { schemaVersion: 1, attributes, formulas, resources, modifiers, effects, ruleset };
}
export function parseProfile(value: unknown): EngineCapacityProfile {
  const o = object(value, '$.profile', ['id', 'capacity', 'roots', 'queryTargets', 'hookDepth', 'units', 'statuses', 'factQueue', 'startup', 'command']);
  const work = (value: unknown, path: string): Work => {
    const v = object(value, path, ['operations', 'hooks', 'queries', 'ast', 'formula', 'scans', 'facts', 'lookups', 'structure']);
    return { operations: count(v['operations'], path), hooks: count(v['hooks'], path), queries: count(v['queries'], path), ast: count(v['ast'], path), formula: count(v['formula'], path), scans: count(v['scans'], path), facts: count(v['facts'], path), lookups: count(v['lookups'], path), structure: count(v['structure'], path) };
  };
  const capacity = work(o['capacity'], 'capacity');
  return { id: text(o['id'], 'profile.id'), capacity, startup: work(o['startup'], 'startup'), command: work(o['command'], 'command'), roots: count(o['roots'], 'roots'), queryTargets: count(o['queryTargets'], 'queryTargets'), hookDepth: count(o['hookDepth'], 'hookDepth'), units: count(o['units'], 'units'), statuses: count(o['statuses'], 'statuses'), factQueue: count(o['factQueue'], 'factQueue', 1) };
}

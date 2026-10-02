import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const allowed = {
  foundation: [], contracts: ['foundation'], content: ['foundation', 'contracts'], simulation: ['foundation', 'contracts'],
  controllers: ['foundation', 'contracts'], presentation: ['foundation', 'contracts'], platform: ['foundation', 'contracts'],
  application: ['foundation', 'contracts', 'content', 'simulation', 'controllers', 'presentation', 'platform']
};
export function cycles(graph) {
  let serial = 0; const indices = new Map(), low = new Map(), stack = [], active = new Set(), result = [];
  function visit(node) {
    indices.set(node, serial); low.set(node, serial++); stack.push(node); active.add(node);
    for (const target of graph.get(node) ?? []) {
      if (!indices.has(target)) { visit(target); low.set(node, Math.min(low.get(node), low.get(target))); }
      else if (active.has(target)) low.set(node, Math.min(low.get(node), indices.get(target)));
    }
    if (low.get(node) === indices.get(node)) {
      const component = []; let item;
      do { item = stack.pop(); active.delete(item); component.push(item); } while (item !== node);
      if (component.length > 1 || (graph.get(node) ?? []).includes(node)) result.push(component.sort());
    }
  }
  for (const node of graph.keys()) if (!indices.has(node)) visit(node);
  return result;
}
function walk(root) {
  if (!fs.existsSync(root)) return [];
  return fs.readdirSync(root, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(root, entry.name)) : /\.(ts|mjs)$/.test(entry.name) ? [path.join(root, entry.name)] : []);
}
function moduleName(relative) { return relative.startsWith('src/') ? relative.split('/')[1] : relative.split('/')[0]; }
function simulationZone(relative) { const parts = relative.split('/'); return parts[2] === 'features' ? `features/${parts[3]}` : parts[2]; }
export function inspect(root) {
  const configPath = path.join(root, 'tsconfig.json');
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const files = ['src', 'tests', 'tools'].flatMap(directory => walk(path.join(root, directory)));
  const errors = [], graph = new Map();
  const whitebox = new Set(['tests/unit/entity-store.whitebox.test.ts', 'tests/simulation/combat-fault.whitebox.test.ts']);
  for (const file of files) {
    const from = path.relative(root, file).replaceAll(path.sep, '/'); graph.set(from, []);
    const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
    const specifiers = [];
    function visit(node) {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
        if (ts.isStringLiteral(node.moduleSpecifier)) specifiers.push(node.moduleSpecifier.text); else errors.push(`${from}: computed import`);
      }
      if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal)) specifiers.push(node.argument.literal.text);
      if (ts.isImportEqualsDeclaration(node)) errors.push(`${from}: import-equals forbidden`);
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
        const argument = node.arguments[0];
        if (argument && ts.isStringLiteral(argument)) specifiers.push(argument.text); else errors.push(`${from}: computed dynamic import/require`);
      }
      ts.forEachChild(node, visit);
    }
    visit(source);
    for (const specifier of specifiers) {
      const local = specifier.startsWith('.') || specifier.startsWith('@/');
      if (specifier.endsWith('.css') && from === 'src/main.ts') continue;
      if (!local) {
        const owner = moduleName(from);
        if (from.startsWith('src/') && !(owner === 'presentation' && specifier === 'phaser')) errors.push(`${from}: external import ${specifier} forbidden`);
        continue;
      }
      const resolved = ts.resolveModuleName(specifier, file, parsed.options, ts.sys).resolvedModule;
      if (!resolved) { errors.push(`${from}: unresolved/case mismatch ${specifier}`); continue; }
      const target = path.relative(root, resolved.resolvedFileName).replaceAll(path.sep, '/'); graph.get(from).push(target);
      const owner = moduleName(from), dependency = moduleName(target);
      if (from.startsWith('src/') && ['controllers', 'presentation'].includes(owner) && target.endsWith('/contracts/index.ts')) {
        let namespace = false;
        function inspectNamespace(node) {
          if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === specifier && node.importClause?.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)) namespace = true;
          if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument) && ts.isStringLiteral(node.argument.literal) && node.argument.literal.text === specifier) namespace = true;
          if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && node.arguments[0] && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === specifier) namespace = true;
          ts.forEachChild(node, inspectNamespace);
        }
        inspectNamespace(source);
        if (namespace) errors.push(`${from}: contracts namespace/import-type exposes authority-only combat/debug data`);
        for (const symbol of ['CombatDebugPort', 'CombatBoundary', 'CombatEntitySnapshot', 'CombatFact', 'CombatRuntime', 'CombatConfig', 'DamageBreakdown', 'CapacityActual', 'FactDelivery', 'CompiledCatalog', 'Operation']) {
          const importing = source.statements.some(node => ts.isImportDeclaration(node) && node.importClause?.namedBindings && ts.isNamedImports(node.importClause.namedBindings) && node.importClause.namedBindings.elements.some(element => (element.propertyName?.text ?? element.name.text) === symbol));
          if (importing) errors.push(`${from}: raw combat/debug contract ${symbol} is authority-only`);
        }
      }
      if (from === 'src/main.ts') { if (dependency !== 'application') errors.push(`${from}: entry must use application`); continue; }
      if (!from.startsWith('src/')) {
        if (target.startsWith('src/') && !target.endsWith('/index.ts') && target !== 'src/presentation/probe.ts' && !whitebox.has(from)) errors.push(`${from}: tests/tools must use public entry ${target}`);
        continue;
      }
      if (from === 'src/platform/browser/battle-assets.ts' && ['content/m3-battle.json', 'content/m3-profile.json'].includes(target)) continue;
      if (!target.startsWith('src/')) { errors.push(`${from}: product imports tests/tools ${target}`); continue; }
      if (owner !== dependency) {
        if (!(allowed[owner] ?? []).includes(dependency)) errors.push(`${from}: whitelist forbids ${target}`);
        if (!target.endsWith('/index.ts') && target !== 'src/presentation/probe.ts') errors.push(`${from}: cross-module internal import ${target}`);
      }
      if (owner === 'simulation' && dependency === 'simulation') {
        const zone = simulationZone(from), other = simulationZone(target);
        const lower = zone === 'runtime' ? true : zone === 'shared' ? other === 'kernel' || other === 'shared' : zone === 'kernel' ? other === 'kernel' : zone?.startsWith('features/') ? other === 'shared' || other === 'kernel' || other === zone : true;
        if (!lower) errors.push(`${from}: simulation internal whitelist forbids ${target}`);
      }
    }
  }
  for (const component of cycles(graph)) errors.push(`dependency cycle: ${component.join(' -> ')}`);
  return { errors, files: files.length, edges: [...graph.values()].reduce((sum, links) => sum + links.length, 0) };
}
export function checkPinned(root) {
  const errors = [], pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const lock = JSON.parse(fs.readFileSync(path.join(root, 'package-lock.json'), 'utf8'));
  for (const [name, version] of Object.entries({ ...pkg.dependencies, ...pkg.devDependencies })) {
    if (!/^\d+\.\d+\.\d+$/.test(version)) errors.push(`${name}: version must be exact`);
    if (lock.packages[`node_modules/${name}`]?.version !== version) errors.push(`${name}: lock mismatch`);
    const installed = JSON.parse(fs.readFileSync(path.join(root, 'node_modules', name, 'package.json'), 'utf8'));
    if (installed.version !== version) errors.push(`${name}: installed mismatch`);
  }
  for (const file of ['yarn.lock', 'pnpm-lock.yaml', 'npm-shrinkwrap.json']) if (fs.existsSync(path.join(root, file))) errors.push(`extra lockfile ${file}`);
  return errors;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.cwd(); const result = inspect(root); const errors = [...result.errors, ...checkPinned(root)];
  if (errors.length) { console.error(errors.join('\n')); process.exitCode = 1; }
  else console.log(`Dependencies PASS: ${result.files} files, ${result.edges} edges; whitelist, SCC, aliases, public entry, pinned versions.`);
}

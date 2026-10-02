import fs from 'node:fs';
import { createServer } from 'vite';
// This M2 corpus has one explicitly registered Ruleset/profile pair. Reject new
// JSON rather than silently leaving it outside the content compilation gate.
const registered = ['m2-fixture.json', 'm2-profile.json'];
const jsonFiles = fs.readdirSync('content', { recursive: true }).filter(name => name.endsWith('.json')).sort();
if (JSON.stringify(jsonFiles) !== JSON.stringify(registered)) throw new Error(`CONTENT_UNREGISTERED: expected ${registered.join(', ')}; found ${jsonFiles.join(', ')}`);
const server = await createServer({ configFile: false, logLevel: 'error', server: { middlewareMode: true } });
try {
  const { compileContent, parseProfile, validateProfile } = await server.ssrLoadModule('/src/content/index.ts');
  const result = compileContent(JSON.parse(fs.readFileSync('content/m2-fixture.json', 'utf8')), 30);
  if (!result.ok) throw new Error(JSON.stringify(result.diagnostics));
  const profile = parseProfile(JSON.parse(fs.readFileSync('content/m2-profile.json', 'utf8')));
  const errors = validateProfile(result.catalog.certificate, profile);
  if (errors.length) throw new Error(errors.join('\n'));
  fs.mkdirSync('reports', { recursive: true });
  fs.writeFileSync('reports/m2-content.json', JSON.stringify({ status: 'PASS', contentHash: result.catalog.contentHash, certificate: result.catalog.certificate, profile }, null, 2) + '\n');
  console.log(`Content PASS: schema/reference/units/attribute DAG/finite fuel/capacity/profile; ${result.catalog.contentHash}`);
} finally { await server.close(); }

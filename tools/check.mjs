import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
const commands = ['typecheck', 'lint', 'check:deps', 'check:docs', 'validate:content', 'test:unit', 'test:content', 'test:sim', 'test:capacity', 'build', 'test:browser'];
const metadata = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const version = metadata.version;
const results = [];
for (const command of commands) {
  const startedAtMs = performance.now();
  const result = spawnSync('npm', ['run', command], { stdio: 'inherit' });
  results.push({ command: `npm run ${command}`, exitCode: result.status, durationMs: performance.now() - startedAtMs,
    stage: 'applicable', status: result.status === 0 ? 'PASS' : 'BLOCKED' });
  fs.mkdirSync('reports', { recursive: true }); fs.writeFileSync('reports/check.json', JSON.stringify({ engineVersion: version, phase: metadata.mobaPhase,
    softwareExit: 'M3 0.4.3 skill-control gap input repair candidate; pending independent source review; Android blocker retest pending; no main/Pages/M4',
    validationScope: 'software only; Android gameplay/hot-state evidence separate; see docs/M3_ACCEPTANCE.md', results }, null, 2));
  if (result.status !== 0) { process.exitCode = result.status ?? 1; break; }
}

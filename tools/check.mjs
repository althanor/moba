import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
const commands = ['typecheck', 'lint', 'check:deps', 'validate:content', 'test:unit', 'test:sim', 'build', 'test:browser'];
const results = [];
for (const command of commands) {
  const startedAtMs = performance.now();
  const result = spawnSync('npm', ['run', command], { stdio: 'inherit' });
  results.push({ command: `npm run ${command}`, exitCode: result.status, durationMs: performance.now() - startedAtMs,
    stage: command === 'validate:content' ? 'NOT_APPLICABLE_M1 (empty-stage guard only)' : 'applicable' });
  fs.mkdirSync('reports', { recursive: true }); fs.writeFileSync('reports/check.json', JSON.stringify({ engineVersion: '0.2.0', phase: 'M1', android: 'pending user hardware execution', results }, null, 2));
  if (result.status !== 0) { process.exitCode = result.status ?? 1; break; }
}

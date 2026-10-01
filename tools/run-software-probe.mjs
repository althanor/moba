import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], { stdio: ['ignore', 'pipe', 'pipe'] });
const address = 'http://127.0.0.1:4175';
const smoke = process.argv.includes('--smoke');
const rounds = smoke ? 1 : 3;
const gestures = smoke ? 2 : 100;
const outputDirectory = smoke ? 'reports/software-probe-smoke' : 'reports/software-probe';
let browser;
const errors = [];
try {
  await new Promise((resolve, reject) => {
    server.stdout.on('data', chunk => { if (String(chunk).includes('http://127.0.0.1:4175/')) resolve(); });
    server.once('exit', code => reject(new Error(`dev server exited ${code}`)));
    server.once('error', reject);
  });
  browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] });
  const context = await browser.newContext({ viewport: { width: 960, height: 540 }, acceptDownloads: true });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  const cdp = await context.newCDPSession(page);
  const frames = async (count = 3) => page.evaluate(async n => {
    for (let i = 0; i < n; i++) await new Promise(resolve => globalThis.requestAnimationFrame(resolve));
  }, count);
  const results = [];
  await page.goto(address); await page.locator('#status').filter({ hasText: 'running' }).waitFor();
  await fs.mkdir('reports', { recursive: true });
  if (!smoke) await page.screenshot({ path: 'reports/M1-desktop.png' });
  // Alternate A/B order between rounds. Software-injected contact -> submission only.
  for (let round = 1; round <= rounds; round++) for (const mode of round % 2 ? ['A', 'B'] : ['B', 'A']) {
    await page.locator(`[data-action="mode${mode}"]`).click(); await frames(4);
    const startedAtMs = performance.now();
    for (let n = 0; n < gestures; n++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 160, y: 300, id: 1 }] }); await frames(3);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 220, y: 300, id: 1 }] }); await frames(4);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await frames(3);
    }
    const downloadPromise = page.waitForEvent('download'); await page.locator('[data-action="export"]').click();
    const download = await downloadPromise; const report = JSON.parse(await fs.readFile(await download.path(), 'utf8'));
    await fs.mkdir(outputDirectory, { recursive: true });
    await fs.writeFile(`${outputDirectory}/${mode}-round-${round}.json`, JSON.stringify(report, null, 2));
    results.push({ round, mode, hostElapsedMs: performance.now() - startedAtMs, measurement: report.measurement, environment: report.environment });
    console.log(`${mode} round ${round}: ${report.measurement.retainedSampleCount} captured; UI ${report.measurement.touchToUI.count}, movement ${report.measurement.touchToAuthority.count}; p95 UI/visual/authority ${report.measurement.touchToUI.p95}/${report.measurement.touchToVisual.p95}/${report.measurement.touchToAuthority.p95} ms`);
  }
  const summary = results.map(({ measurement, ...rest }) => ({ ...rest, touchToUI: measurement.touchToUI, touchToVisual: measurement.touchToVisual,
    touchToAuthority: measurement.touchToAuthority, tickCpuMs: measurement.tickCpuMs, frameMs: measurement.frameMs,
    simulationCpuMsPerSecond: measurement.simulationCpuMsPerSecond, frameCpuMs: measurement.frameCpuMs, measuredFrameCpuMsPerSecond: measurement.measuredFrameCpuMsPerSecond, correctionWorld: measurement.correctionWorld, reconciliation: measurement.reconciliation, byPhase: measurement.byPhase }));
  await fs.writeFile(`${outputDirectory}/summary.json`, JSON.stringify({ method: `Desktop Chromium 141, SwiftShader, CDP injected touches, ${rounds} alternating rounds x ${gestures} gestures per mode. ${smoke ? 'PROCESS CLEANUP SMOKE ONLY.' : ''} NO Android / physical end-to-end / heat / power acceptance.`, results: summary, errors }, null, 2));
  if (errors.length || results.some(result => result.measurement.touchToAuthority.count < gestures)) throw new Error('Missing required movement samples or browser errors');
} finally { await browser?.close(); server.kill('SIGTERM'); }

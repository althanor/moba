import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createBuildInfo } from './tools/build-info.mjs';
let commit: string | null = null;
let dirty = true;
try {
  commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  dirty = execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim().length > 0;
} catch { /* Archive/local builds retain explicit unknown provenance. */ }
const version: string = JSON.parse(fs.readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version;
const buildInfo = createBuildInfo(process.env, commit, dirty, version, 'M2');
export default defineConfig({ base: './', resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  define: { __BUILD_INFO__: JSON.stringify(buildInfo) },
  plugins: [{ name: 'm1-build-provenance', generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'build-info.json', source: JSON.stringify(buildInfo, null, 2) + '\n' });
  } }],
  build: { target: 'chrome107', sourcemap: true, rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } } } });

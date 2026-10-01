import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { checkPinned, inspect } from '../../tools/check-deps.mjs';
function fixture(files: Record<string, string>, callback: (root: string) => void): void {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'm1-deps-'));
  try {
    fs.writeFileSync(path.join(root, 'tsconfig.json'), JSON.stringify({ compilerOptions: { moduleResolution: 'Bundler', baseUrl: '.', paths: { '@/*': ['src/*'] } } }));
    for (const [file, code] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, file)), { recursive: true }); fs.writeFileSync(path.join(root, file), code); }
    callback(root);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
describe('real import graph enforcement', () => {
  it('checks the actual project whitelist, all resolved edges and exact installed versions', () => {
    expect(inspect(process.cwd()).errors).toEqual([]); expect(checkPinned(process.cwd())).toEqual([]);
  });
  it('rejects alias type-only presentation → simulation access', () => {
    fixture({ 'src/presentation/index.ts': "import type { World } from '@/simulation/index';", 'src/simulation/index.ts': 'export interface World {}' }, root => {
      expect(inspect(root).errors.join('\n')).toContain('whitelist forbids');
    });
  });
  it('detects cycles across re-exports, dynamic imports and import-type expressions', () => {
    fixture({ 'src/foundation/index.ts': "export * from './second';", 'src/foundation/second.ts': "type A = import('./third').A;", 'src/foundation/third.ts': "export const A = import('./index');" }, root => {
      expect(inspect(root).errors.join('\n')).toContain('dependency cycle');
    });
  });
  it('detects self loops, computed imports, bad case and feature-to-feature coupling', () => {
    fixture({ 'src/foundation/index.ts': "import './index'; import './Second'; import(name);", 'src/foundation/second.ts': '',
      'src/simulation/features/actions/a.ts': "import '../combat/c';", 'src/simulation/features/combat/c.ts': '' }, root => {
      const errors = inspect(root).errors.join('\n'); expect(errors).toContain('dependency cycle'); expect(errors).toContain('computed');
      expect(errors).toContain('case mismatch'); expect(errors).toContain('simulation internal whitelist');
    });
  });
  it('rejects DOM/Phaser dependency and product imports of test helpers', () => {
    fixture({ 'src/simulation/index.ts': "import Phaser from 'phaser'; import '../../tests/helper';", 'tests/helper.ts': '' }, root => {
      const errors = inspect(root).errors.join('\n'); expect(errors).toContain('external import phaser forbidden'); expect(errors).toContain('product imports tests/tools');
    });
  });
  it('lint actually rejects environment-driven authority and unseeded random', () => {
    const result = spawnSync(process.execPath, ['node_modules/eslint/bin/eslint.js', '--stdin', '--stdin-filename', 'src/simulation/runtime/forbidden.ts'], {
      input: 'export const bad = () => { document.title = String(Math.random()); setTimeout(() => {}, 1); return performance.now(); };', encoding: 'utf8'
    });
    expect(result.status).toBe(1); expect(result.stdout).toContain('no-restricted-globals'); expect(result.stdout).toContain('no-restricted-syntax');
  });
});

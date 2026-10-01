import js from '@eslint/js';
import tseslint from 'typescript-eslint';
const pureGlobals = ['window', 'document', 'navigator', 'performance', 'Date', 'requestAnimationFrame', 'setTimeout', 'setInterval', 'fetch', 'localStorage', 'indexedDB', 'Worker'];
export default tseslint.config(
  { ignores: ['node_modules/**', 'dist/**', 'reports/**', 'test-results/**', 'playwright-report/**'] },
  js.configs.recommended, ...tseslint.configs.recommended,
  { files: ['**/*.mjs'], languageOptions: { globals: { process: 'readonly', console: 'readonly', URL: 'readonly' } } },
  { files: ['**/*.ts'], rules: { '@typescript-eslint/no-non-null-assertion': 'error', '@typescript-eslint/consistent-type-imports': 'error', '@typescript-eslint/no-explicit-any': 'error' } },
  { files: ['src/foundation/**/*.ts', 'src/contracts/**/*.ts', 'src/simulation/**/*.ts', 'src/controllers/**/*.ts', 'src/application/session/**/*.ts'], rules: {
    'no-restricted-globals': ['error', ...pureGlobals],
    'no-restricted-syntax': ['error', { selector: "MemberExpression[object.name='Math'][property.name='random']", message: 'Use seeded RNG in pure logic.' },
      { selector: "MemberExpression[object.name='globalThis']", message: 'No environment globals in pure logic.' }]
  } },
  { files: ['src/simulation/**/*.ts'], rules: { 'no-restricted-syntax': ['error',
    { selector: "MemberExpression[object.name='Math'][property.name='random']", message: 'Seeded RNG required.' },
    { selector: "MemberExpression[object.name='globalThis']", message: 'No environment globals.' },
    { selector: 'AwaitExpression', message: 'Simulation is synchronous.' },
    { selector: "Identifier[name='Promise']", message: 'Simulation cannot own asynchronous tasks.' },
    { selector: 'FunctionDeclaration[async=true]', message: 'Simulation is synchronous.' },
    { selector: 'ArrowFunctionExpression[async=true]', message: 'Simulation is synchronous.' }]
  } }
);

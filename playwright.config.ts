import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir: './tests/browser', timeout: 30000, use: { baseURL: 'http://127.0.0.1:4173/moba/', viewport: { width: 960, height: 540 }, headless: true,
  launchOptions: { args: ['--enable-unsafe-swiftshader'] } }, reporter: [['list'], ['json', { outputFile: 'reports/browser.json' }]],
  webServer: { command: 'npx vite build --base=/moba/ --outDir node_modules/.cache/m1-pages-dist && npm run preview -- --base=/moba/ --outDir node_modules/.cache/m1-pages-dist --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/moba/', reuseExistingServer: false } });

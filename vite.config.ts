import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
export default defineConfig({ base: './', resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  build: { target: 'chrome107', sourcemap: true, rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } } } });

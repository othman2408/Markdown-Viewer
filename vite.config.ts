import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

const svelteConfigFile = fileURLToPath(new URL('./svelte.config.mjs', import.meta.url));

export default defineConfig({
  root: 'client',
  cacheDir: '../.tmp-svelte-vite',
  publicDir: 'public',
  plugins: [svelte({ configFile: svelteConfigFile })],
  resolve: process.env.VITEST ? { conditions: ['browser'] } : undefined,
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': 'http://127.0.0.1:8080',
      '/login': 'http://127.0.0.1:8080',
      '/logout': 'http://127.0.0.1:8080',
      '/share': 'http://127.0.0.1:8080',
      '/healthz': 'http://127.0.0.1:8080'
    }
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true
  }
});

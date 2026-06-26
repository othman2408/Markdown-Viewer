import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';

const svelteConfigFile = fileURLToPath(new URL('./svelte.config.mjs', import.meta.url));
const serverTarget = 'http://127.0.0.1:8080';
const createServerProxy = () => ({
  target: serverTarget,
  changeOrigin: false as const
});

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
      '/api': createServerProxy(),
      '/healthz': createServerProxy()
    }
  },
  build: {
    outDir: '../dist/client',
    emptyOutDir: true
  }
});

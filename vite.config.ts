import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

import { resolveViteBasePath } from './src/utils/viteBasePath';

export default defineConfig(({ mode }) => ({
  base: resolveViteBasePath(mode),
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Keep the heavy renderer lazy without forcing cross-graph vendor cycles.
          return id.includes('/node_modules/three/') ? 'vendor-three' : undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
    dedupe: ['react', 'react-dom', 'three'],
  },
}));

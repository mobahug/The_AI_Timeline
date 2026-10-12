/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the project site from /<repo>/, so the production build
// needs that base. The dev server does not: with a base set, Vite answers the
// bare origin with a 302, and any tool that probes http://localhost:<port>/ for
// readiness concludes the server never came up and kills it. Serve at / in dev.
export default defineConfig(({ command, isPreview }) => ({
  base: process.env.BASE_PATH || (command === 'build' || isPreview ? '/The_AI_Timeline/' : '/'),
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsInlineLimit: 0,
    // React in its own chunk: it changes rarely, the site's data changes often,
    // and a reader who has one cached should not download both. Rolldown names
    // the group; what it catches is what Rollup's manualChunks caught.
    rolldownOptions: { output: { codeSplitting: { groups: [{ name: 'vendor', test: /node_modules[\\/]react/ }] } } },
    chunkSizeWarningLimit: 600
  },
  // Vitest 2 typed this block as a side effect of the tests importing it;
  // Vitest 5 types it only through the reference at the top of this file.
  test: { environment: 'node', include: ['tests/**/*.test.ts'] }
}));

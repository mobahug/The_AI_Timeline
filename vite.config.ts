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
    // and a reader who has one cached should not download both.
    rollupOptions: { output: { manualChunks: (id) => (id.includes('node_modules/react') ? 'vendor' : undefined) } },
    chunkSizeWarningLimit: 600
  },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] }
}));

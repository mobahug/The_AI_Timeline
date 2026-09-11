import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the project site from /<repo>/, so the production build
// needs that base. The dev server does not: with a base set, Vite answers the
// bare origin with a 302, and any tool that probes http://localhost:<port>/ for
// readiness concludes the server never came up and kills it. Serve at / in dev.
export default defineConfig(({ command }) => ({
  base: process.env.BASE_PATH || (command === 'build' ? '/The_AI_Timeline/' : '/'),
  plugins: [react()],
  build: { outDir: 'dist', assetsInlineLimit: 0 },
  test: { environment: 'node', include: ['tests/**/*.test.js'] }
}));

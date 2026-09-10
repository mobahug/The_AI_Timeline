import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves the project site from /<repo>/
export default defineConfig({
  base: process.env.BASE_PATH || '/The_AI_Timeline/',
  plugins: [react()],
  build: { outDir: 'dist', assetsInlineLimit: 0 },
  test: { environment: 'node', include: ['tests/**/*.test.js'] }
});

import { defineConfig } from 'vitest/config';

// Relative base so the same build works on GitHub Pages (/ump/) and any static host.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    modulePreload: { polyfill: false },
    chunkSizeWarningLimit: 900,
  },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/golden/**/*.test.ts'],
  },
});

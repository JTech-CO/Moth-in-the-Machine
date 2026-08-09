import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    globals: false,
    passWithNoTests: false,
    include: ['src/utils/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/utils/**/*.ts'],
      exclude: ['src/utils/**/*.test.ts'],
      reporter: ['text', 'html'],
      reportsDirectory: 'coverage',
      reportOnFailure: true,
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
        perFile: true,
      },
    },
  },
});

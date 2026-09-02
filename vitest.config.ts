import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'test/conformance/**/*.test.ts'],
    clearMocks: true,
    restoreMocks: true,
    css: {
      include: /styles\.css(?:\?raw)?$/,
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});

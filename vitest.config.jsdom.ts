import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    include: ['__tests__/dom/**/*.test.tsx', '__tests__/dom/**/*.test.ts'],
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.dom.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
  esbuild: {
    tsconfigRaw: {
      compilerOptions: {
        strict: false,
      },
    },
  },
});

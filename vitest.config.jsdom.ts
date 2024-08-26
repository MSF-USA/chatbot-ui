import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    include: ['__tests__/dom/**/*.test.tsx'],
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.dom.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});

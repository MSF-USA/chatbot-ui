import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    globals: true,
    include: ['__tests__/node/**/*.test.ts'],
    environment: 'node',
    setupFiles: ['./vitest.setup.node.ts'],
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

import path from 'path';
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  {
    test: {
      name: 'dom',
      globals: true,
      environment: 'jsdom',
      include: ['__tests__/dom/**/*.test.tsx'],
      setupFiles: ['./vitest.setup.dom.ts'],
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
  },

  {
    test: {
      name: 'node',
      globals: true,
      environment: 'node',
      include: ['__tests__/node/**/*.test.ts'],
      setupFiles: ['./vitest.setup.node.ts'],
      alias: {
        '@': path.resolve(__dirname, './'),
      },
    },
  },
]);

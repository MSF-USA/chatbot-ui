import path from 'path';
import { defineWorkspace } from 'vitest/config';

export default defineWorkspace([
  // Project for DOM/browser tests
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

  // Project for Node.js tests
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

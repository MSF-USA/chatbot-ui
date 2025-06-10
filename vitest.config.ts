import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    workspace: './vitest.workspace.ts',

    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: ['src/**'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '__tests__/**',
        'vitest.config.ts',
        'vitest.workspace.ts',
        'vitest.setup.dom.ts',
        'vitest.setup.node.ts',
        'coverage/**',
      ],
    },
  },
});

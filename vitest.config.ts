import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    include: [
      '__tests__/utils/**/*.test.ts',
    ],
    environment: 'node'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },

});

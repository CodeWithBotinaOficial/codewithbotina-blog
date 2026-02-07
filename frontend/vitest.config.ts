import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig({
  test: {
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    globals: true,
    env: loadEnv('test', process.cwd(), ''),
    resolve: {
      alias: {
        '~': '/src',
      },
    },
  },
});

import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "preact",
  },
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

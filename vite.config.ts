import { defineConfig } from 'vitest/config'
import preact from '@preact/preset-vite'
import { fileURLToPath } from 'node:url'

// `base` is the one variable that separates a project-page build from a
// custom-domain build (SPEC 7.3). Nothing else about the deployment differs.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/',
  plugins: [preact()],
  resolve: {
    alias: { '~': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
  },
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/**/types.ts',
        'src/i18n/strings.ts',
      ],
      thresholds: {
        // SPEC 8.1: 80% overall, 100% where a bug is silent.
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
        'src/nostr/**': { lines: 100, functions: 100, branches: 100, statements: 100 },
        'src/model/**': { lines: 100, functions: 100, branches: 100, statements: 100 },
      },
    },
  },
})

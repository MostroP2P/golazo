import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end, against the built site. The default run is hermetic: the relay
 * is intercepted in the browser and answers with the real signed fixtures
 * (`tests/e2e/relay.ts`), so the whole trust path runs without a network.
 * `npm run test:e2e:live` runs `live.spec.ts` against the real relays.
 */
const PORT = 4321
/** The deployment's base path, so the tested site is served where it will live. */
const BASE = process.env.VITE_BASE ?? '/'
/**
 * In CI the site was already built once, with the deployment's base, and
 * those bytes are what gets published: building again here would overwrite
 * dist/ with a different build. Locally, build first.
 */
const PREVIEW = `npx vite preview --host 127.0.0.1 --port ${PORT} --strictPort`

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: `http://127.0.0.1:${PORT}${BASE}`,
    trace: 'on-first-retry',
    // The hermetic suite reads the Spanish catalogue; one test switches to English.
    locale: 'es-AR',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: process.env.CI ? PREVIEW : `npm run build && ${PREVIEW}`,
    url: `http://127.0.0.1:${PORT}${BASE}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})

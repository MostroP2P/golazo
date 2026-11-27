/**
 * Against the real relays (SPEC 8.1). Not part of the hermetic run: figures
 * move, so this only checks what must hold for any cut — the page goes live,
 * September and October 2026 are closed and match what was published, and
 * nothing fails axe. Run with `npm run test:e2e:live`.
 */
import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.skip(!process.env.GOLAZO_LIVE, 'set GOLAZO_LIVE=1 to run against the real relays')

test('goes live against the real relays and shows the closed months as published', async ({
  page,
}) => {
  await page.goto('/')
  await expect(page.getByText('En vivo')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: 10_000 })
  const chart = page.getByRole('img', { name: /Dev fee mensual/ })
  await expect(chart.locator('title', { hasText: 'sep 26: 238.433 sats' })).toHaveCount(1)
  await expect(chart.locator('title', { hasText: 'oct 26: 283.798 sats' })).toHaveCount(1)
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag22aa'])
    .analyze()
  expect(results.violations).toEqual([])
})

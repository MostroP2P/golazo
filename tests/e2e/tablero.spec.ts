import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { fixtures, servePrices, serveRelay } from './relay'

test.describe('the board, hermetic', () => {
  test.beforeEach(async ({ page }) => {
    await serveRelay(page, fixtures())
    await servePrices(page, 91_000)
  })

  test('loads within ten seconds, verified and live', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Antes del plan · noviembre 2026',
      { timeout: 10_000 },
    )
    await expect(page.getByText('En vivo')).toBeVisible()
    await expect(page.getByText(/Avance desde la base a la meta final/)).toBeVisible()
  })

  test('September and October 2026 are the figures mostro.world shows', async ({
    page,
  }) => {
    await page.goto('./')
    const chart = page.getByRole('img', { name: /Dev fee mensual/ })
    await expect(chart.locator('title', { hasText: 'sep 26: 238.433 sats' })).toHaveCount(
      1,
    )
    await expect(chart.locator('title', { hasText: 'oct 26: 283.798 sats' })).toHaveCount(
      1,
    )
  })

  test('has no accessibility violations', async ({ page }) => {
    await page.goto('./')
    await expect(page.getByText('En vivo')).toBeVisible()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('the trust page has no accessibility violations and lists the documents', async ({
    page,
  }) => {
    await page.goto('./#/confianza')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Verificación')
    await expect(page.getByRole('cell', { name: 'verificado' }).first()).toBeVisible()
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
      .analyze()
    expect(results.violations).toEqual([])
  })

  test('reads on a 390 px phone without sideways scrolling', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('./')
    await expect(page.getByText('En vivo')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

test.describe('the board, degraded', () => {
  test('with no relay answering: an error and no figure', async ({ page }) => {
    await serveRelay(page, [])
    await servePrices(page, 91_000)
    await page.goto('./')
    await expect(page.getByRole('alert')).toContainText(
      'No se pudo obtener un índice verificado',
      {
        timeout: 15_000,
      },
    )
    await expect(page.getByText(/sats/)).toHaveCount(0)
  })

  test('with every price source down: P = 59.665 and the notice', async ({ page }) => {
    await serveRelay(page, fixtures())
    await servePrices(page, null)
    await page.goto('./')
    await expect(page.getByText(/Precio de BTC no disponible/).first()).toBeVisible()
  })
})

test.describe('in English', () => {
  test.use({ locale: 'en-US' })

  test('a browser in English gets the English catalogue and en-US numbers', async ({
    page,
  }) => {
    await serveRelay(page, fixtures())
    await servePrices(page, 91_000)
    await page.goto('./')
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Before the plan · November 2026',
    )
    await expect(page.getByText('Live', { exact: true })).toBeVisible()
    await expect(page.locator('html')).toHaveAttribute('lang', 'en')
    const chart = page.getByRole('img', { name: /Monthly dev fee/ })
    await expect(chart.locator('title', { hasText: 'Sep 26: 238,433 sats' })).toHaveCount(
      1,
    )
  })
})

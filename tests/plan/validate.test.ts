import { describe, expect, test } from 'vitest'
import { validatePlan } from '~/plan/validate'
import { PLAN } from '~/plan/load'
import { rawPlan } from '../helpers/plan'

function errorsOf(raw: unknown): readonly string[] {
  const result = validatePlan(raw)
  return result.ok ? [] : result.errors
}

describe('the bundled plan', () => {
  test('is valid', () => {
    expect(PLAN.ok).toBe(true)
  })

  test('adds up to the annual target of 15.309.000 sats', () => {
    // Arrange
    const plan = PLAN.ok ? PLAN.plan : null

    // Act
    const total = plan?.months.reduce((sum, m) => sum + m.metaSats, 0)

    // Assert
    expect(total).toBe(15_309_000)
  })

  test('closes quarters on months 3, 6, 9 and 12', () => {
    const plan = PLAN.ok ? PLAN.plan : null
    const closes = plan?.months.filter((m) => m.quarterClose).map((m) => m.n)
    expect(closes).toEqual([3, 6, 9, 12])
  })
})

describe('validatePlan', () => {
  test('refuses a month whose floor is above its target', () => {
    // Arrange
    const raw = rawPlan()
    raw.months[4]!['pisoSats'] = 800_000

    // Act
    const errors = errorsOf(raw)

    // Assert
    expect(errors).toContain('months[4]: pisoSats must be below metaSats')
  })

  test('refuses a floor equal to its target', () => {
    const raw = rawPlan()
    raw.months[0]!['pisoSats'] = 360_000
    expect(errorsOf(raw)).toContain('months[0]: pisoSats must be below metaSats')
  })

  test('refuses targets that do not grow', () => {
    const raw = rawPlan()
    raw.months[2]!['metaSats'] = 436_000
    expect(errorsOf(raw)).toContain(
      'months[2].metaSats: must grow from the previous month',
    )
  })

  test('refuses floors that do not grow', () => {
    const raw = rawPlan()
    raw.months[2]!['pisoSats'] = 388_000
    expect(errorsOf(raw)).toContain(
      'months[2].pisoSats: must grow from the previous month',
    )
  })

  test('refuses months that skip one', () => {
    const raw = rawPlan()
    raw.months[1]!['month'] = '2027-02'
    expect(errorsOf(raw)).toContain('months[1].month: expected 2027-01')
  })

  test('refuses a plan with a month missing', () => {
    const raw = rawPlan()
    raw.months.pop()
    expect(errorsOf(raw)).toContain('months: expected exactly 12 months')
  })

  test('refuses months numbered out of order', () => {
    const raw = rawPlan()
    raw.months[3]!['n'] = 7
    expect(errorsOf(raw)).toContain('months[3].n: expected 4')
  })

  test('reports every bad field of a month, not just the first', () => {
    // Arrange
    const raw = rawPlan()
    Object.assign(raw.months[0]!, {
      month: '2026-13',
      metaSats: 1.5,
      pisoSats: -1,
      completedPerDay: 0,
      completionRate: 1.2,
      quarterClose: 'T9',
    })

    // Act
    const errors = errorsOf(raw)

    // Assert
    expect(errors).toEqual(
      expect.arrayContaining([
        'months[0].month: expected YYYY-MM',
        'months[0].metaSats: positive integer',
        'months[0].pisoSats: positive integer',
        'months[0].completedPerDay: positive number',
        'months[0].completionRate: in (0, 1]',
        'months[0].quarterClose: one of T1, T2, T3, T4',
      ]),
    )
  })

  test('refuses a month that is not an object', () => {
    const raw = rawPlan()
    raw.months[0] = 'diciembre' as never
    expect(errorsOf(raw)).toContain('months[0]: not an object')
  })

  test('refuses a wrong version, name and reference price', () => {
    const raw = rawPlan()
    Object.assign(raw, { version: 2, plan: 7, referencePriceUsd: 0 })
    expect(errorsOf(raw)).toEqual(
      expect.arrayContaining([
        'version: expected 1',
        'plan: expected a name',
        'referencePriceUsd: positive number',
      ]),
    )
  })

  test('refuses a broken base', () => {
    const raw = rawPlan()
    Object.assign(raw.base, { period: null, devFeeSats: 'x', completionRate: 0 })
    expect(errorsOf(raw)).toEqual(
      expect.arrayContaining([
        'base.period: expected {from, until}',
        'base.devFeeSats: positive number',
        'base.completionRate: in (0, 1]',
      ]),
    )
  })

  test('refuses a base that is not an object', () => {
    const raw = rawPlan()
    raw['base'] = 5 as never
    expect(errorsOf(raw)).toContain('base: not an object')
  })

  test('refuses history that does not lead up to the plan', () => {
    const raw = rawPlan()
    raw.history = ['2026-08', '2026-10']
    expect(errorsOf(raw)).toEqual(
      expect.arrayContaining([
        'history[0]: months must be consecutive up to the plan',
        'history[1]: months must be consecutive up to the plan',
      ]),
    )
  })

  test('refuses history that is not a list of months', () => {
    const raw = rawPlan()
    raw.history = '2026-09'
    expect(errorsOf(raw)).toContain('history: expected a list of YYYY-MM')
  })

  test('accepts empty history', () => {
    const raw = rawPlan()
    raw.history = []
    expect(validatePlan(raw).ok).toBe(true)
  })

  test('checks history even when the months are unusable', () => {
    const raw = rawPlan()
    raw['months'] = 'none' as never
    raw.history = ['2026-09', '2026-11']
    expect(errorsOf(raw)).toContain(
      'history[0]: months must be consecutive up to the plan',
    )
  })

  test('accepts a frozen monthly price and refuses a bad one', () => {
    const good = rawPlan()
    good.monthlyPriceUsd = { '2026-12': 61000 }
    const bad = rawPlan()
    bad.monthlyPriceUsd = { diciembre: -1 }
    const notObject = rawPlan()
    notObject.monthlyPriceUsd = []

    expect(validatePlan(good).ok).toBe(true)
    expect(errorsOf(bad)).toEqual([
      'monthlyPriceUsd.diciembre: key must be YYYY-MM',
      'monthlyPriceUsd.diciembre: positive number',
    ])
    expect(errorsOf(notObject)).toContain('monthlyPriceUsd: expected an object')
  })

  test('refuses something that is not a plan at all', () => {
    expect(errorsOf(null)).toEqual(['plan: not an object'])
  })
})

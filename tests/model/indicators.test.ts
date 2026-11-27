import { describe, expect, test } from 'vitest'
import {
  accumulated,
  annualTarget,
  closedOnTarget,
  completedPerDay,
  completionRate,
  growth,
  onTarget,
  progressToFinal,
  requiredRate,
  reviewAlert,
} from '~/model/indicators'
import { phaseOf } from '~/model/months'
import { formatPercent } from '~/model/format'
import { at, realPlan } from '../helpers/plan'

const plan = realPlan()

describe('supporting metrics (SPEC 5.7)', () => {
  test('1.461 completed over 26,776 days is 54,6 orders a day', () => {
    const now = at('2026-11-27T18:37:00Z')
    expect(completedPerDay(1461, '2026-11', 'current', now)).toBeCloseTo(54.56, 2)
  })

  test('a closed month divides by all its days', () => {
    expect(completedPerDay(3000, '2026-11', 'closed', 0)).toBe(100)
  })

  test('an absent count, a future month or no elapsed time has no rate', () => {
    expect(completedPerDay(null, '2026-11', 'closed', 0)).toBeNull()
    expect(completedPerDay(5, '2026-12', 'future', 0)).toBeNull()
    expect(
      completedPerDay(5, '2026-12', 'current', at('2026-12-01T00:00:00Z')),
    ).toBeNull()
  })

  test('1.461 / 6.525 is a 22,4 % completion rate', () => {
    expect(completionRate(1461, 6525)).toBeCloseTo(0.2239, 4)
  })

  test('nothing created means no completion rate, not zero', () => {
    expect(completionRate(0, 0)).toBeNull()
    expect(completionRate(null, 5)).toBeNull()
    expect(completionRate(5, null)).toBeNull()
  })

  test('more is better, and absence is neither', () => {
    expect(onTarget(69, 69)).toBe(true)
    expect(onTarget(68, 69)).toBe(false)
    expect(onTarget(null, 69)).toBeNull()
    expect(onTarget(5, null)).toBeNull()
  })
})

describe('year indicators (SPEC 5.8)', () => {
  test('the annual target is 15.309.000 sats', () => {
    expect(annualTarget(plan)).toBe(15_309_000)
  })

  test('progress is measured from the base, not from zero', () => {
    // From the base (297,000) to the final target (2,970,000).
    expect(progressToFinal(297_000, plan)).toBe(0)
    expect(progressToFinal(2_970_000, plan)).toBe(1)
    expect(progressToFinal(401_100, plan)).toBeCloseTo(0.0389, 4)
    expect(progressToFinal(1_485_000, plan)).toBeCloseTo(0.4444, 4)
    expect(progressToFinal(200_000, plan)).toBeLessThan(0)
    expect(progressToFinal(null, plan)).toBeNull()
  })

  test('growth against the previous month', () => {
    expect(growth(436_000, 400_000)).toBeCloseTo(0.09, 6)
    expect(growth(null, 1)).toBeNull()
    expect(growth(1, null)).toBeNull()
    expect(growth(1, 0)).toBeNull()
  })

  test('required rate from V = 528.000 in month 3 is 21,2 %', () => {
    // (2.970.000 / 528.000)^(1/9) − 1 = 0,21157 → shown as 21,2 %
    const rate = requiredRate(528_000, 3, plan)
    expect(rate).toBeCloseTo(0.21157, 5)
    expect(formatPercent(rate)).toBe('21,2 %')
  })

  test('before the plan, n = 0 and twelve months remain', () => {
    expect(requiredRate(297_000, 0, plan)).toBeCloseTo(10 ** (1 / 12) - 1, 6)
  })

  test('no required rate in the last month, or without a value', () => {
    expect(requiredRate(2_000_000, 12, plan)).toBeNull()
    expect(requiredRate(null, 3, plan)).toBeNull()
    expect(requiredRate(0, 3, plan)).toBeNull()
  })

  test('accumulated: closed months in full, the current one pro rata', () => {
    // Arrange: mid-January 2027, December closed at 350.000, January at 200.000.
    const now = at('2027-01-16T12:00:00Z')
    const reals = new Map([
      ['2026-12', 350_000],
      ['2027-01', 200_000],
    ])

    // Act
    const result = accumulated(plan, reals, now, (m) => phaseOf(m, now))

    // Assert
    expect(result.actual).toBe(550_000)
    expect(result.target).toBeCloseTo(360_000 + (436_000 * 15.5) / 31, 6)
    expect(result.annual).toBe(15_309_000)
    expect(result.missing).toEqual([])
  })

  test('accumulated names the months whose figure is absent', () => {
    const now = at('2027-01-16T12:00:00Z')
    const result = accumulated(plan, new Map(), now, (m) => phaseOf(m, now))
    expect(result.actual).toBe(0)
    expect(result.missing).toEqual(['2026-12', '2027-01'])
  })

  test('closed months on target counts greens over all closed', () => {
    expect(closedOnTarget(['verde', 'amarillo', 'verde', 'sin-datos'])).toEqual({
      green: 2,
      total: 4,
    })
  })

  test('the review alert needs the last two closed months both red', () => {
    expect(reviewAlert(['verde', 'rojo', 'rojo'])).toBe(true)
    expect(reviewAlert(['rojo', 'rojo', 'amarillo'])).toBe(false)
    expect(reviewAlert(['rojo'])).toBe(false)
    expect(reviewAlert([])).toBe(false)
  })
})

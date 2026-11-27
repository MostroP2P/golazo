import { describe, expect, test } from 'vitest'
import {
  currentPlanMonth,
  evaluate,
  judged,
  monthState,
  neededDocuments,
} from '~/model/months'
import { at, realPlan } from '../helpers/plan'

const plan = realPlan()

describe('monthState (SPEC 5.1)', () => {
  test('on 27 Nov 2026: November is history and December is future', () => {
    const now = at('2026-11-27T18:37:00Z')
    expect(monthState(plan, '2026-11', now)).toBe('previo')
    expect(monthState(plan, '2026-12', now)).toBe('futuro')
  })

  test('on 2 Dec 2026: December is in course', () => {
    expect(monthState(plan, '2026-12', at('2026-12-02T00:00:00Z'))).toBe('en-curso')
  })

  test('on 1 Jan 2027: December is closed and January in course', () => {
    const now = at('2027-01-01T00:00:00Z')
    expect(monthState(plan, '2026-12', now)).toBe('cerrado')
    expect(monthState(plan, '2027-01', now)).toBe('en-curso')
  })

  test('a month outside both history and plan has no state', () => {
    expect(monthState(plan, '2026-01', at('2026-11-27T00:00:00Z'))).toBeNull()
  })
})

describe('currentPlanMonth', () => {
  test('is null before the plan and the plan month during it', () => {
    expect(currentPlanMonth(plan, at('2026-11-27T00:00:00Z'))).toBeNull()
    expect(currentPlanMonth(plan, at('2027-02-10T00:00:00Z'))?.n).toBe(3)
  })
})

describe('evaluate (SPEC 5.2)', () => {
  test('projects November from 355.908 sats over 26,776 days to 398.766 sats', () => {
    // Arrange
    const now = at('2026-11-27T18:37:00Z')

    // Act
    const result = evaluate(355_908, '2026-11', now)

    // Assert
    expect(result.kind).toBe('projected')
    if (result.kind !== 'projected') return
    expect(result.days).toBeCloseTo(26.776, 3)
    expect(Math.round(result.value)).toBe(398_766)
    expect(result.accumulated).toBe(355_908)
  })

  test('does not project with one day elapsed: insufficient data', () => {
    const result = evaluate(12_000, '2026-12', at('2026-12-02T00:00:00Z'))
    expect(result).toEqual({ kind: 'insufficient', accumulated: 12_000, days: 1 })
    expect(judged(result)).toBeNull()
  })

  test('a closed month is judged on its real figure', () => {
    const result = evaluate(400_000, '2026-12', at('2027-01-01T00:00:00Z'))
    expect(result).toEqual({ kind: 'closed', value: 400_000 })
    expect(judged(result)).toBe(400_000)
  })

  test('an absent figure is absent, never zero', () => {
    expect(evaluate(null, '2026-12', at('2027-01-05T00:00:00Z'))).toEqual({
      kind: 'absent',
    })
  })

  test('a month that has not begun is future even with a figure', () => {
    expect(evaluate(5, '2027-03', at('2027-01-05T00:00:00Z'))).toEqual({ kind: 'future' })
  })
})

describe('neededDocuments (SPEC 4)', () => {
  test('before the plan: both years, daily series from September to now, the summary', () => {
    const ds = neededDocuments(plan, at('2026-11-27T18:37:00Z'))
    expect(ds).toEqual([
      'series:dev-fees:monthly:2026',
      'series:dev-fees:monthly:2027',
      'series:orders:monthly:2026',
      'series:orders:monthly:2027',
      'series:volume:monthly:2026',
      'series:volume:monthly:2027',
      'series:dev-fees:daily:2026-09',
      'series:orders:daily:2026-09',
      'series:dev-fees:daily:2026-10',
      'series:orders:daily:2026-10',
      'series:dev-fees:daily:2026-11',
      'series:orders:daily:2026-11',
      'summary:30d',
    ])
  })

  test('never asks past November 2027', () => {
    const ds = neededDocuments(plan, at('2028-03-01T00:00:00Z'))
    expect(ds).toContain('series:dev-fees:daily:2027-11')
    expect(ds).not.toContain('series:dev-fees:daily:2027-12')
  })

  test('starts at the first plan month when there is no history', () => {
    const ds = neededDocuments({ ...plan, history: [] }, at('2026-12-10T00:00:00Z'))
    expect(ds.filter((d) => d.includes(':daily:'))).toEqual([
      'series:dev-fees:daily:2026-12',
      'series:orders:daily:2026-12',
    ])
  })
})

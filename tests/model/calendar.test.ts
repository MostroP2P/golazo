import { describe, expect, test } from 'vitest'
import {
  addMonths,
  daysElapsed,
  daysInMonth,
  daysOf,
  isMonth,
  monthEnd,
  monthOf,
  monthRange,
  monthStart,
} from '~/model/calendar'
import { at } from '../helpers/plan'

describe('calendar, in UTC', () => {
  test('recognises YYYY-MM and nothing else', () => {
    expect(isMonth('2026-12')).toBe(true)
    expect(isMonth('2026-13')).toBe(false)
    expect(isMonth('2026-1')).toBe(false)
    expect(isMonth(202612)).toBe(false)
  })

  test('adds months across a year boundary, both ways', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01')
    expect(addMonths('2027-01', -1)).toBe('2026-12')
    expect(addMonths('2026-09', 14)).toBe('2027-11')
  })

  test('throws on something that is not a month', () => {
    expect(() => addMonths('nov', 1)).toThrow('not a month: nov')
  })

  test('bounds a month at the first instant of it and of the next', () => {
    expect(monthStart('2027-02')).toBe(at('2027-02-01T00:00:00Z'))
    expect(monthEnd('2027-02')).toBe(at('2027-03-01T00:00:00Z'))
  })

  test('counts 28 to 31 days', () => {
    expect(daysInMonth('2027-02')).toBe(28)
    expect(daysInMonth('2026-11')).toBe(30)
    expect(daysInMonth('2026-12')).toBe(31)
  })

  test('places an instant in its UTC month', () => {
    expect(monthOf(at('2026-11-30T23:59:59Z'))).toBe('2026-11')
    expect(monthOf(at('2026-12-01T00:00:00Z'))).toBe('2026-12')
  })

  test('lists a range of months, inclusive, and nothing when reversed', () => {
    expect(monthRange('2026-11', '2027-01')).toEqual(['2026-11', '2026-12', '2027-01'])
    expect(monthRange('2027-01', '2026-11')).toEqual([])
  })

  test('counts elapsed days with decimals: 26,776 on 27 Nov 18:37', () => {
    expect(daysElapsed('2026-11', at('2026-11-27T18:37:00Z'))).toBeCloseTo(26.776, 3)
  })

  test('names every day of a month', () => {
    const days = daysOf('2027-02')
    expect(days).toHaveLength(28)
    expect(days[0]).toBe('2027-02-01')
    expect(days[27]).toBe('2027-02-28')
  })
})

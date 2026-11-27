import { afterEach, describe, expect, test } from 'vitest'
import {
  formatChange,
  formatDecimal,
  formatInstant,
  formatMillions,
  formatMonthLong,
  formatMonthShort,
  formatPercent,
  formatSats,
  formatUsd,
  formatUsdExact,
  setFormatLocale,
} from '~/model/format'
import { at } from '../helpers/plan'

describe('es-AR formats (SPEC 6.4)', () => {
  test('sats: thousands with a point, no decimals', () => {
    expect(formatSats(398_766.4)).toBe('398.766')
    expect(formatSats(6088)).toBe('6.088')
  })

  test('USD: no decimals on screen, two where a target is stated exactly', () => {
    expect(formatUsd(1772.05)).toBe('1.772')
    expect(formatUsdExact(315.0312)).toBe('315,03')
  })

  test('percentages and decimals: one decimal, comma', () => {
    expect(formatPercent(0.22391)).toBe('22,4 %')
    expect(formatDecimal(54.564)).toBe('54,6')
  })

  test('a change carries its sign', () => {
    expect(formatChange(0.189)).toBe('+18,9 %')
    expect(formatChange(-0.05)).toBe('−5,0 %')
    expect(formatChange(0)).toBe('0,0 %')
  })

  test('millions, short', () => {
    expect(formatMillions(1_320_000)).toBe('1,32 M')
  })

  test('absence renders as a dash in every formatter, never as zero', () => {
    for (const format of [
      formatSats,
      formatUsd,
      formatUsdExact,
      formatDecimal,
      formatPercent,
      formatChange,
      formatMillions,
    ]) {
      expect(format(null)).toBe('—')
      expect(format(undefined)).toBe('—')
      expect(format(Number.NaN)).toBe('—')
    }
  })

  test('months and instants, in Spanish and UTC', () => {
    expect(formatMonthLong('2026-11')).toBe('noviembre 2026')
    expect(formatMonthShort('2027-02')).toBe('feb 27')
    expect(formatInstant(at('2026-11-27T18:37:26Z'))).toBe('27 nov 18:37 UTC')
    expect(formatInstant(at('2027-01-05T03:04:00Z'))).toBe('5 ene 03:04 UTC')
  })

  test('an unknown month falls back to its own text', () => {
    expect(formatMonthLong('2026-13')).toBe('2026-13')
    expect(formatMonthShort('2026-13')).toBe('2026-13')
  })
})

describe('en-US formats', () => {
  afterEach(() => setFormatLocale('es'))

  test('follow the English locale once it is set', () => {
    setFormatLocale('en')
    expect(formatSats(398_766)).toBe('398,766')
    expect(formatPercent(0.22391)).toBe('22.4%')
    expect(formatChange(-0.05)).toBe('−5.0%')
    expect(formatUsdExact(315.0312)).toBe('315.03')
    expect(formatMillions(1_320_000)).toBe('1.32 M')
    expect(formatMonthLong('2026-11')).toBe('November 2026')
    expect(formatMonthShort('2027-02')).toBe('Feb 27')
    expect(formatInstant(at('2026-11-27T18:37:26Z'))).toBe('27 Nov 18:37 UTC')
  })
})

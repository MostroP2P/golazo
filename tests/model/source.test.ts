import { describe, expect, test } from 'vitest'
import { blockedBy, metricValue, seriesCell, valueOf, type Source } from '~/model/source'
import { fixturePayloads, series } from '../helpers/sources'

const payloads = fixturePayloads()
const ok = (d: string): Source => ({ status: 'ok', d, payload: payloads.get(d)! })

describe('seriesCell', () => {
  test('reads September 2026: 238.433 sats of dev fee', () => {
    const datum = seriesCell(ok('series:dev-fees:monthly:2026'), '2026-09', 'total_sats')
    expect(datum).toEqual({ kind: 'value', value: 238_433 })
  })

  test('a published null is absence, not zero', () => {
    const datum = seriesCell(ok('series:dev-fees:monthly:2026'), '2026-12', 'total_sats')
    expect(datum).toEqual({ kind: 'absent' })
    expect(valueOf(datum)).toBeNull()
  })

  test('a missing row or column is absence', () => {
    const source = ok('series:dev-fees:monthly:2026')
    expect(seriesCell(source, '2031-01', 'total_sats').kind).toBe('absent')
    expect(seriesCell(source, '2026-09', 'nonexistent').kind).toBe('absent')
  })

  test('a window document read as a series is absence', () => {
    expect(seriesCell(ok('summary:30d'), '2026-09', 'total_sats').kind).toBe('absent')
  })

  test('a text cell is absence', () => {
    const source: Source = {
      status: 'ok',
      d: 'x',
      payload: series(['label'], [['2026-09', 'n/a']]),
    }
    expect(seriesCell(source, '2026-09', 'label').kind).toBe('absent')
  })

  test('a document that did not arrive blocks the figure and says which', () => {
    expect(seriesCell({ status: 'unavailable', d: 'x' }, '2026-09', 'a')).toEqual({
      kind: 'blocked',
      d: 'x',
      status: 'unavailable',
    })
    expect(seriesCell({ status: 'loading', d: 'x' }, '2026-09', 'a')).toEqual({
      kind: 'blocked',
      d: 'x',
      status: 'loading',
    })
  })

  test('a document that failed its proof blocks the figure with the reason', () => {
    const source: Source = { status: 'unverified', d: 'x', reason: 'hash' }
    expect(seriesCell(source, '2026-09', 'a')).toEqual({
      kind: 'blocked',
      d: 'x',
      status: 'unverified',
      reason: 'hash',
    })
  })
})

describe('metricValue', () => {
  test('reads the active instances of the last 30 days: 10', () => {
    expect(metricValue(ok('summary:30d'), 'summary.active_instances')).toEqual({
      kind: 'value',
      value: 10,
    })
  })

  test('a missing metric, or a series read as a window, is absence', () => {
    expect(metricValue(ok('summary:30d'), 'summary.nothing').kind).toBe('absent')
    expect(metricValue(ok('series:dev-fees:monthly:2026'), 'x').kind).toBe('absent')
  })

  test('a blocked document blocks the metric', () => {
    expect(metricValue({ status: 'unavailable', d: 's' }, 'x').kind).toBe('blocked')
  })
})

describe('blockedBy', () => {
  test('a readable source blocks nothing', () => {
    expect(blockedBy(ok('summary:30d'))).toEqual({ kind: 'absent' })
  })
})

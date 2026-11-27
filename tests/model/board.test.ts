import { describe, expect, test } from 'vitest'
import { buildBoard } from '~/model/board'
import type { BoardInput } from '~/model/rows'
import type { KnownPrices } from '~/price/choose'
import type { Payload } from '~/nostr/documents'
import { at, realPlan } from '../helpers/plan'
import { fixturePayloads, series, sourcesFrom } from '../helpers/sources'

const plan = realPlan()
const payloads = fixturePayloads()
const noPrices: KnownPrices = { closed: new Map(), current: { status: 'failed' } }

function input(now: string, overrides: Partial<BoardInput> = {}): BoardInput {
  return {
    plan,
    now: at(now),
    source: sourcesFrom(payloads),
    prices: noPrices,
    restated: new Map(),
    ...overrides,
  }
}

/** A 2027 dev-fee series with the given monthly totals (and full coverage). */
function devFees2027(totals: Record<string, number | null>, coverage = 1): Payload {
  return {
    ...series(
      ['total_sats', 'coverage'],
      Object.entries(totals).map(([month, total]) => [month, total, coverage]),
    ),
    columns: [
      { name: 'date', unit: 'date' },
      { name: 'total_sats', unit: 'sats' },
      { name: 'coverage', unit: 'ratio' },
    ],
  }
}

function withDocs(docs: Record<string, Payload>): Map<string, Payload> {
  return new Map([...payloads, ...Object.entries(docs)])
}

describe('the board on 27 Nov 2026, from the real snapshot', () => {
  const board = buildBoard(input('2026-11-27T18:37:00Z'))

  test('is before the plan, with November as the card and no light', () => {
    expect(board.stage).toBe('before')
    expect(board.n).toBe(0)
    expect(board.current.month).toBe('2026-11')
    expect(board.current.state).toBe('previo')
    expect(board.current.light).toBeNull()
  })

  test('projects November to 398.766 sats', () => {
    const evaluation = board.current.evaluation
    expect(evaluation.kind).toBe('projected')
    if (evaluation.kind === 'projected')
      expect(Math.round(evaluation.value)).toBe(398_766)
  })

  test('reads September and October as published', () => {
    const real = (month: string) => board.rows.find((r) => r.month === month)?.real
    expect(real('2026-09')).toEqual({ kind: 'value', value: 238_433 })
    expect(real('2026-10')).toEqual({ kind: 'value', value: 283_798 })
  })

  test('has fifteen months: three of history and the twelve of the plan', () => {
    expect(board.rows.map((r) => r.month)).toHaveLength(15)
    expect(board.rows.filter((r) => r.state === 'futuro')).toHaveLength(12)
  })

  test('the missing 2027 series leaves those months without data and without error', () => {
    const january = board.rows.find((r) => r.month === '2027-01')!
    expect(january.real).toEqual({
      kind: 'blocked',
      d: 'series:dev-fees:monthly:2027',
      status: 'unavailable',
    })
    expect(january.light).toBeNull()
  })

  test('compares November’s levers against the base', () => {
    expect(board.current.perDay.value).toBeCloseTo(1461 / 26.776, 1)
    expect(board.current.perDay.target).toBe(43)
    expect(board.current.perDay.ok).toBe(true)
    expect(board.current.rate.target).toBe(0.21)
    expect(board.current.ticket.value).toBe(140_386)
  })

  test('reads 10 active nodes from the 30-day summary', () => {
    expect(board.activeNodes).toEqual({ kind: 'value', value: 10 })
  })

  test('progress starts from the base: November’s projection is 3,9 % of the way', () => {
    expect(board.year.progress).toBeCloseTo((398_766 - 297_000) / (2_970_000 - 297_000), 4)
  })

  test('the required rate counts twelve months from November’s projection', () => {
    expect(board.year.requiredRate).toBeCloseTo((2_970_000 / 398_766) ** (1 / 12) - 1, 3)
    expect(board.year.previousMonth).toBe('2026-10')
    expect(board.year.growth).toBeCloseTo(398_766 / 283_798 - 1, 3)
  })

  test('the pace chart accumulates November day by day up to today', () => {
    expect(board.pace.points).toHaveLength(27)
    expect(board.pace.points[0]).toEqual({ day: 1, cumulative: 4644 })
    expect(board.pace.metaSats).toBeNull()
    expect(board.pace.datum).toBeNull()
  })

  test('nothing has closed, so nothing counts and nothing alarms', () => {
    expect(board.year.closedOnTarget).toEqual({ green: 0, total: 0 })
    expect(board.year.reviewAlert).toBe(false)
    expect(board.year.quarters.map((q) => q.quarter)).toEqual(['T1', 'T2', 'T3', 'T4'])
    expect(board.year.accumulated.actual).toBe(0)
  })
})

describe('the board during the plan', () => {
  test('December in course, one day in: insufficient data and no light', () => {
    const board = buildBoard(
      input('2026-12-02T00:00:00Z', {
        source: sourcesFrom(
          withDocs({
            'series:dev-fees:monthly:2026': devFees2027({ '2026-12': 9_000 }),
          }),
        ),
      }),
    )
    expect(board.stage).toBe('during')
    expect(board.n).toBe(1)
    expect(board.current.state).toBe('en-curso')
    expect(board.current.evaluation.kind).toBe('insufficient')
    expect(board.current.light).toBeNull()
  })

  test('February closed and March in course: lights, growth and accumulated', () => {
    // Arrange
    const docs = withDocs({
      'series:dev-fees:monthly:2026': devFees2027({ '2026-12': 365_000 }),
      'series:dev-fees:monthly:2027': devFees2027({
        '2027-01': 400_000,
        '2027-02': 470_000,
        '2027-03': 300_000,
      }),
    })
    const prices: KnownPrices = {
      closed: new Map([
        ['2026-12', { status: 'ok', usd: 60_000, source: 'coingecko-average' }],
        ['2027-01', { status: 'ok', usd: 60_000, source: 'coingecko-average' }],
        ['2027-02', { status: 'ok', usd: 80_000, source: 'coingecko-average' }],
      ]),
      current: { status: 'ok', usd: 60_000, source: 'yadio' },
    }

    // Act
    const board = buildBoard(
      input('2027-03-16T00:00:00Z', { source: sourcesFrom(docs), prices }),
    )
    const row = (month: string) => board.rows.find((r) => r.month === month)!

    // Assert
    expect(row('2026-12').light).toBe('verde')
    expect(row('2027-01').light).toBe('amarillo')
    // Case B of SPEC 5.6: below target in sats, above it in USD.
    expect(row('2027-02').light).toBe('verde')
    expect(row('2027-02').realUsd).toBeCloseTo(376, 6)
    expect(board.current.month).toBe('2027-03')
    expect(board.current.evaluation.kind).toBe('projected')
    expect(board.year.closedOnTarget).toEqual({ green: 2, total: 3 })
    expect(board.year.quarters[0]).toEqual({
      quarter: 'T1',
      month: '2027-02',
      light: 'verde',
      closed: true,
    })
    expect(board.year.accumulated.actual).toBe(365_000 + 400_000 + 470_000 + 300_000)
  })

  test('two closed months in a row below the floor raise the review alert', () => {
    const docs = withDocs({
      'series:dev-fees:monthly:2026': devFees2027({ '2026-12': 365_000 }),
      'series:dev-fees:monthly:2027': devFees2027({
        '2027-01': 100_000,
        '2027-02': 100_000,
      }),
    })
    // Every price source failed: P falls back to the reference, so the lights are final.
    const prices: KnownPrices = {
      closed: new Map(
        ['2026-12', '2027-01', '2027-02'].map((m) => [m, { status: 'failed' as const }]),
      ),
      current: { status: 'failed' },
    }
    const board = buildBoard(
      input('2027-03-10T00:00:00Z', { source: sourcesFrom(docs), prices }),
    )
    expect(board.year.reviewAlert).toBe(true)
  })

  test('one closed month below the floor does not', () => {
    const docs = withDocs({
      'series:dev-fees:monthly:2026': devFees2027({ '2026-12': 365_000 }),
      'series:dev-fees:monthly:2027': devFees2027({ '2027-01': 100_000 }),
    })
    const board = buildBoard(input('2027-02-10T00:00:00Z', { source: sourcesFrom(docs) }))
    expect(board.year.reviewAlert).toBe(false)
  })

  test('an absent closed month is "sin datos", never red', () => {
    const docs = withDocs({
      'series:dev-fees:monthly:2026': devFees2027({ '2026-12': null }),
    })
    const board = buildBoard(input('2027-01-10T00:00:00Z', { source: sourcesFrom(docs) }))
    expect(board.rows.find((r) => r.month === '2026-12')!.light).toBe('sin-datos')
  })

  test('partial payment coverage is flagged below 95 %', () => {
    const docs = withDocs({
      'series:dev-fees:monthly:2026': devFees2027({ '2026-12': 365_000 }, 0.9),
    })
    const board = buildBoard(input('2027-01-10T00:00:00Z', { source: sourcesFrom(docs) }))
    const december = board.rows.find((r) => r.month === '2026-12')!
    expect(december.partialCoverage).toBe(true)
    expect(december.coverage).toBe(0.9)
  })

  test('a restated closed month says so; an unchanged one does not', () => {
    // Arrange
    const before = devFees2027({ '2026-12': 300_000, '2026-11': 355_908 })
    const after = devFees2027({ '2026-12': 365_000, '2026-11': 355_908 })
    const docs = withDocs({ 'series:dev-fees:monthly:2026': after })
    const restated = new Map([
      ['series:dev-fees:monthly:2026', { because: 'backfill', previous: before }],
    ])

    // Act
    const board = buildBoard(
      input('2027-01-10T00:00:00Z', { source: sourcesFrom(docs), restated }),
    )

    // Assert
    expect(board.rows.find((r) => r.month === '2026-12')!.restated).toBe('backfill')
    expect(board.rows.find((r) => r.month === '2026-12')!.light).toBe('verde')
    expect(board.rows.find((r) => r.month === '2026-11')!.restated).toBeNull()
  })

  test('a closed month with no monthly series is summed from a complete daily one', () => {
    // Arrange: drop the 2026 monthly series; November's daily is complete by then.
    const days = Array.from({ length: 30 }, (_, i) => [
      `2026-11-${String(i + 1).padStart(2, '0')}`,
      1000,
    ])
    const docs = new Map(payloads)
    docs.delete('series:dev-fees:monthly:2026')
    docs.set('series:dev-fees:daily:2026-11', series(['total_sats'], days))

    // Act
    const board = buildBoard(input('2026-12-10T00:00:00Z', { source: sourcesFrom(docs) }))
    const november = board.rows.find((r) => r.month === '2026-11')!

    // Assert
    expect(november.real).toEqual({ kind: 'value', value: 30_000 })
    expect(november.derivedFromDaily).toBe(true)
  })

  test('an incomplete daily series is not summed', () => {
    const docs = new Map(payloads)
    docs.delete('series:dev-fees:monthly:2026')
    const board = buildBoard(input('2026-12-10T00:00:00Z', { source: sourcesFrom(docs) }))
    const november = board.rows.find((r) => r.month === '2026-11')!
    expect(november.real.kind).toBe('blocked')
    expect(november.derivedFromDaily).toBe(false)
  })

  test('an unverified daily series blocks the pace chart and says why', () => {
    const board = buildBoard(
      input('2026-11-27T18:37:00Z', {
        source: sourcesFrom(payloads, {
          'series:dev-fees:daily:2026-11': {
            status: 'unverified',
            d: 'series:dev-fees:daily:2026-11',
            reason: 'hash',
          },
        }),
      }),
    )
    expect(board.pace.datum).toMatchObject({ kind: 'blocked', status: 'unverified' })
    expect(board.pace.points.every((p) => p.cumulative === null)).toBe(true)
  })
})

describe('the board after the plan', () => {
  test('shows November 2027 closed as the plan’s result', () => {
    const board = buildBoard(input('2028-01-05T00:00:00Z'))
    expect(board.stage).toBe('after')
    expect(board.current.month).toBe('2027-11')
    expect(board.current.state).toBe('cerrado')
    expect(board.n).toBe(12)
    expect(board.year.requiredRate).toBeNull()
  })
})

describe('the card before history begins', () => {
  test('clamps to the first history month', () => {
    const board = buildBoard(input('2026-05-05T00:00:00Z'))
    expect(board.current.month).toBe('2026-09')
  })

  test('clamps to the first plan month when there is no history', () => {
    const board = buildBoard({
      ...input('2026-05-05T00:00:00Z'),
      plan: { ...plan, history: [] },
    })
    expect(board.current.month).toBe('2026-12')
  })
})

describe('a closed month whose price is still on its way', () => {
  const docs = () =>
    withDocs({
      'series:dev-fees:monthly:2026': devFees2027({ '2026-12': 330_000 }),
      'series:dev-fees:monthly:2027': devFees2027({ '2027-01': 400_000 }),
    })
  const pending: KnownPrices = { closed: new Map(), current: { status: 'pending' } }

  test('has no light below target in sats, and counts as no data', () => {
    const board = buildBoard(
      input('2027-02-10T00:00:00Z', { source: sourcesFrom(docs()), prices: pending }),
    )
    const december = board.rows.find((r) => r.month === '2026-12')!
    expect(december.price?.source).toBe('pending')
    expect(december.light).toBeNull()
    expect(board.year.closedOnTarget).toEqual({ green: 0, total: 2 })
    expect(board.year.reviewAlert).toBe(false)
  })

  test('is already green when the sats alone meet the target', () => {
    const board = buildBoard(
      input('2027-02-10T00:00:00Z', { source: sourcesFrom(docs()), prices: pending }),
    )
    expect(board.rows.find((r) => r.month === '2027-01')!.light).toBeNull()
    const met = buildBoard(
      input('2027-02-10T00:00:00Z', {
        source: sourcesFrom(
          withDocs({
            'series:dev-fees:monthly:2026': devFees2027({ '2026-12': 365_000 }),
          }),
        ),
        prices: pending,
      }),
    )
    expect(met.rows.find((r) => r.month === '2026-12')!.light).toBe('verde')
  })

  test('turns green once its real average shows the USD target was met', () => {
    const board = buildBoard(
      input('2027-02-10T00:00:00Z', {
        source: sourcesFrom(docs()),
        prices: {
          closed: new Map([
            ['2026-12', { status: 'ok', usd: 80_000, source: 'coingecko-average' }],
          ]),
          current: { status: 'pending' },
        },
      }),
    )
    expect(board.rows.find((r) => r.month === '2026-12')!.light).toBe('verde')
  })
})

describe('Codex review on #1: the pace after a missing day', () => {
  test('every running total after a missing day is unknown, not resumed', () => {
    const daily = series(
      ['total_sats'],
      [
        ['2026-11-01', 100],
        ['2026-11-02', null],
        ['2026-11-03', 300],
      ],
    )
    const board = buildBoard(
      input('2026-11-03T12:00:00Z', {
        source: sourcesFrom(withDocs({ 'series:dev-fees:daily:2026-11': daily })),
      }),
    )
    expect(board.pace.points.map((p) => p.cumulative)).toEqual([100, null, null])
  })
})

describe('Codex review on #1: each figure at its own document’s coverage', () => {
  /** Sources with a coverage per document, in ms. */
  function covered(docs: Map<string, Payload>, coverage: Record<string, string>) {
    const base = sourcesFrom(docs)
    return (d: string) => {
      const source = base(d)
      return source.status === 'ok' && coverage[d]
        ? { ...source, coverage: Date.parse(coverage[d]) }
        : source
    }
  }
  const december = (total: number) =>
    withDocs({ 'series:dev-fees:monthly:2026': devFees2027({ '2026-12': total }) })

  test('a retained, older document elsewhere does not shorten a fresh fee’s projection', () => {
    // 200,000 sats over 20 days; the summary was kept from an index 10 days older.
    const board = buildBoard(
      input('2026-12-21T00:00:00Z', {
        source: covered(december(200_000), {
          'series:dev-fees:monthly:2026': '2026-12-21T00:00:00Z',
          'summary:30d': '2026-12-11T00:00:00Z',
        }),
      }),
    )
    const evaluation = board.current.evaluation
    expect(evaluation.kind === 'projected' && Math.round(evaluation.value)).toBe(310_000)
  })

  test('a fee document kept from an older index is projected over its own days', () => {
    // The fee reached day 10; the archive has moved on to day 20.
    const board = buildBoard(
      input('2026-12-21T00:00:00Z', {
        source: covered(december(100_000), {
          'series:dev-fees:monthly:2026': '2026-12-11T00:00:00Z',
        }),
      }),
    )
    const evaluation = board.current.evaluation
    expect(evaluation.kind === 'projected' && evaluation.days).toBe(10)
    expect(evaluation.kind === 'projected' && Math.round(evaluation.value)).toBe(310_000)
  })

  test('orders per day and the pace follow their own documents too', () => {
    const board = buildBoard(
      input('2026-11-27T18:37:00Z', {
        source: covered(payloads, {
          'series:orders:monthly:2026': '2026-11-21T00:00:00Z',
          'series:dev-fees:daily:2026-11': '2026-11-10T12:00:00Z',
        }),
      }),
    )
    expect(board.current.perDay.value).toBeCloseTo(1461 / 20, 6)
    expect(board.pace.points).toHaveLength(10)
  })
})

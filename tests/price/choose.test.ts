import { describe, expect, test } from 'vitest'
import { choosePrice, isFallback, type KnownPrices } from '~/price/choose'
import { realPlan } from '../helpers/plan'

const plan = realPlan()
const none: KnownPrices = { closed: new Map(), current: { status: 'pending' } }

describe('choosePrice (SPEC 5.4)', () => {
  test('a price frozen in the plan wins over everything', () => {
    const frozen = { ...plan, monthlyPriceUsd: { '2026-12': 61_000 } }
    const known: KnownPrices = {
      closed: new Map([
        ['2026-12', { status: 'ok', usd: 99, source: 'coingecko-average' }],
      ]),
      current: none.current,
    }
    expect(choosePrice(frozen, '2026-12', 'closed', known)).toEqual({
      usd: 61_000,
      source: 'config',
    })
  })

  test('a closed month uses its CoinGecko average', () => {
    const known: KnownPrices = {
      closed: new Map([
        ['2026-12', { status: 'ok', usd: 70_000, source: 'coingecko-average' }],
      ]),
      current: none.current,
    }
    expect(choosePrice(plan, '2026-12', 'closed', known)).toEqual({
      usd: 70_000,
      source: 'coingecko-average',
    })
  })

  test('the month in course uses the live price', () => {
    const known: KnownPrices = {
      closed: new Map(),
      current: { status: 'ok', usd: 88_000, source: 'yadio' },
    }
    expect(choosePrice(plan, '2027-01', 'current', known)).toEqual({
      usd: 88_000,
      source: 'yadio',
    })
  })

  test('when every source failed: P = 59.665 and the quote says so', () => {
    const known: KnownPrices = {
      closed: new Map([['2026-12', { status: 'failed' }]]),
      current: { status: 'failed' },
    }
    const closed = choosePrice(plan, '2026-12', 'closed', known)
    const current = choosePrice(plan, '2027-01', 'current', known)
    expect(closed).toEqual({ usd: 59_665, source: 'reference' })
    expect(current).toEqual({ usd: 59_665, source: 'reference' })
    expect(isFallback(closed)).toBe(true)
  })

  test('while a price is still on its way the reference stands in, marked pending', () => {
    const quote = choosePrice(plan, '2026-12', 'closed', none)
    expect(quote).toEqual({ usd: 59_665, source: 'pending' })
    expect(isFallback(quote)).toBe(false)
  })

  test('a future month has no price', () => {
    expect(choosePrice(plan, '2027-05', 'future', none)).toBeNull()
    expect(isFallback(null)).toBe(false)
  })
})

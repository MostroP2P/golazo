import { describe, expect, test, vi } from 'vitest'
import {
  dailyAverage,
  fetchCurrentPrice,
  fetchMonthAverage,
  type Fetch,
} from '~/price/fetch'

function respond(routes: Record<string, unknown>): Fetch & { calls: string[] } {
  const calls: string[] = []
  const fetcher = (url: string) => {
    calls.push(url)
    const key = Object.keys(routes).find((prefix) => url.startsWith(prefix))
    const body = key === undefined ? undefined : routes[key]
    if (body === undefined) return Promise.reject(new Error('offline'))
    if (body === 500) return Promise.resolve(new Response('no', { status: 500 }))
    return Promise.resolve(new Response(JSON.stringify(body)))
  }
  return Object.assign(fetcher, { calls })
}

const YADIO = 'https://api.yadio.io/exrates/BTC'
const SIMPLE = 'https://api.coingecko.com/api/v3/simple/price'
const RANGE = 'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range'

describe('fetchCurrentPrice', () => {
  test('takes Yadio’s BTC.USD when it answers', async () => {
    const fetcher = respond({ [YADIO]: { BTC: { USD: 91_000 } } })
    expect(await fetchCurrentPrice(fetcher)).toEqual({ usd: 91_000, source: 'yadio' })
    expect(fetcher.calls).toHaveLength(1)
  })

  test('falls back to CoinGecko when Yadio fails', async () => {
    const fetcher = respond({ [YADIO]: 500, [SIMPLE]: { bitcoin: { usd: 90_500 } } })
    expect(await fetchCurrentPrice(fetcher)).toEqual({ usd: 90_500, source: 'coingecko' })
  })

  test('is null when both fail, including a nonsense answer', async () => {
    const fetcher = respond({ [YADIO]: { BTC: { USD: 'lots' } } })
    expect(await fetchCurrentPrice(fetcher)).toBeNull()
  })

  test('aborts a source that hangs', async () => {
    vi.useFakeTimers()
    const fetcher: Fetch = (_url, init) =>
      new Promise((_, reject) =>
        init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))),
      )
    const result = fetchCurrentPrice(fetcher)
    await vi.advanceTimersByTimeAsync(20_000)
    expect(await result).toBeNull()
    vi.useRealTimers()
  })
})

describe('fetchMonthAverage', () => {
  test('asks CoinGecko for the month in Unix seconds and averages by day', async () => {
    // Arrange: two points on 1 Dec, one on 2 Dec.
    const day = Date.UTC(2026, 11, 1)
    const fetcher = respond({
      [RANGE]: {
        prices: [
          [day + 1000, 60_000],
          [day + 2000, 62_000],
          [day + 86_400_000, 70_000],
          ['bad'],
        ],
      },
    })

    // Act
    const average = await fetchMonthAverage(fetcher, '2026-12')

    // Assert
    expect(average).toBe((61_000 + 70_000) / 2)
    expect(fetcher.calls[0]).toContain('&from=1796083200&to=1798761600')
  })

  test('is null without a price list', async () => {
    expect(
      await fetchMonthAverage(respond({ [RANGE]: { error: 'x' } }), '2026-12'),
    ).toBeNull()
  })
})

describe('dailyAverage', () => {
  test('ignores points that are not prices and is null with none left', () => {
    expect(
      dailyAverage([
        [0, -1],
        [Number.NaN, 5],
      ]),
    ).toBeNull()
  })
})

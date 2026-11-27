/**
 * BTC/USD from Yadio and CoinGecko, SPEC 5.4. Network only: which price wins
 * is `choose.ts`'s decision. `fetch` is injected so tests never touch the net,
 * and every failure — network, status, shape — is an explicit `null`.
 */
import { PRICE } from '~/config'
import { DAY_MS, monthEnd, monthStart } from '~/model/calendar'
import type { PriceSource } from './choose'

export type Fetch = (url: string, init?: { signal?: AbortSignal }) => Promise<Response>

export type Quote = { readonly usd: number; readonly source: PriceSource }

async function getJson(fetcher: Fetch, url: string): Promise<unknown> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), PRICE.timeoutMs)
  try {
    const response = await fetcher(url, { signal: controller.signal })
    if (!response.ok) return null
    return (await response.json()) as unknown
  } catch {
    // A refused, aborted or unparseable answer is a price this source did
    // not give; the caller falls through to the next one.
    return null
  } finally {
    clearTimeout(timer)
  }
}

function positive(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function field(value: unknown, ...path: string[]): unknown {
  return path.reduce<unknown>(
    (node, key) =>
      typeof node === 'object' && node !== null
        ? (node as Record<string, unknown>)[key]
        : undefined,
    value,
  )
}

/** The live price: Yadio, then CoinGecko. Null when both fail. */
export async function fetchCurrentPrice(fetcher: Fetch): Promise<Quote | null> {
  const yadio = positive(field(await getJson(fetcher, PRICE.yadio), 'BTC', 'USD'))
  if (yadio !== null) return { usd: yadio, source: 'yadio' }
  const gecko = positive(
    field(await getJson(fetcher, PRICE.coingeckoSimple), 'bitcoin', 'usd'),
  )
  return gecko !== null ? { usd: gecko, source: 'coingecko' } : null
}

/**
 * Simple mean of daily prices: CoinGecko answers hourly points for a range
 * this short, so each UTC day is first reduced to its own mean and the month
 * is the mean of its days. A day with no point does not count as zero.
 */
export function dailyAverage(
  points: readonly (readonly [number, number])[],
): number | null {
  const days = new Map<number, number[]>()
  for (const [ms, usd] of points) {
    if (positive(usd) === null || !Number.isFinite(ms)) continue
    const day = Math.floor(ms / DAY_MS)
    days.set(day, [...(days.get(day) ?? []), usd])
  }
  if (days.size === 0) return null
  const means = [...days.values()].map((v) => v.reduce((a, b) => a + b, 0) / v.length)
  return means.reduce((a, b) => a + b, 0) / means.length
}

function isPoint(value: unknown): value is [number, number] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    typeof value[0] === 'number' &&
    typeof value[1] === 'number'
  )
}

/** A closed month's average, from CoinGecko's range endpoint. */
export async function fetchMonthAverage(
  fetcher: Fetch,
  month: string,
): Promise<number | null> {
  const from = Math.floor(monthStart(month) / 1000)
  const to = Math.floor(monthEnd(month) / 1000)
  const body = await getJson(fetcher, `${PRICE.coingeckoRange}&from=${from}&to=${to}`)
  const prices = field(body, 'prices')
  if (!Array.isArray(prices)) return null
  return dailyAverage(prices.filter(isPoint))
}

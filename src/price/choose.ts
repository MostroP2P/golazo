/**
 * Which BTC/USD price a month's real fee is converted at, SPEC 5.4. Pure: the
 * fetched figures come in, the decision and its provenance come out, and the
 * screen always names the source because no price here is signed.
 */
import type { Plan } from '~/plan/types'
import type { Phase } from '~/model/months'

export type PriceSource =
  /** Frozen by the team in `monthlyPriceUsd`. */
  | 'config'
  /** Simple mean of CoinGecko's daily prices for a closed month. */
  | 'coingecko-average'
  | 'yadio'
  | 'coingecko'
  /** Still being fetched: the reference stands in, which equals the sats measure. */
  | 'pending'
  /** Every source failed: the reference stands in and a notice says so. */
  | 'reference'

export type PriceQuote = { readonly usd: number; readonly source: PriceSource }

export type Lookup =
  | { readonly status: 'pending' }
  | { readonly status: 'failed' }
  | { readonly status: 'ok'; readonly usd: number; readonly source: PriceSource }

export type KnownPrices = {
  /** Closed months' averages, by `YYYY-MM`. Missing means not asked yet. */
  readonly closed: ReadonlyMap<string, Lookup>
  /** The live price, for the month in course. */
  readonly current: Lookup
}

const PENDING: Lookup = { status: 'pending' }

export function choosePrice(
  plan: Plan,
  month: string,
  phase: Phase,
  known: KnownPrices,
): PriceQuote | null {
  if (phase === 'future') return null
  const frozen = plan.monthlyPriceUsd[month]
  if (frozen !== undefined) return { usd: frozen, source: 'config' }
  const lookup = phase === 'closed' ? (known.closed.get(month) ?? PENDING) : known.current
  if (lookup.status === 'ok') return { usd: lookup.usd, source: lookup.source }
  return {
    usd: plan.referencePriceUsd,
    source: lookup.status === 'pending' ? 'pending' : 'reference',
  }
}

/** True when the USD measure is just the sats measure in disguise. */
export function isFallback(quote: PriceQuote | null): boolean {
  return quote?.source === 'reference'
}

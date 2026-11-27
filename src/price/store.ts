/**
 * Prices as state: the live price, refreshed every five minutes, and each
 * closed month's average, fetched once and cached — and asked again on the
 * next tick when no source could answer.
 */
import { signal, type Signal } from '@preact/signals'
import { PRICE } from '~/config'
import type { KnownPrices, Lookup } from './choose'
import { fetchCurrentPrice, fetchMonthAverage, type Fetch } from './fetch'
import { readMonthPrice, writeMonthPrice } from './cache'

export type PriceStore = {
  readonly known: Signal<KnownPrices>
  /** Ask for these closed months' averages; months already known are skipped. */
  needClosed(months: readonly string[]): void
  start(): void
  stop(): void
}

export function createPriceStore(fetcher: Fetch): PriceStore {
  const known = signal<KnownPrices>({ closed: new Map(), current: { status: 'pending' } })
  let timer: ReturnType<typeof setInterval> | null = null

  const setClosed = (month: string, lookup: Lookup) => {
    const closed = new Map(known.value.closed)
    closed.set(month, lookup)
    known.value = { ...known.value, closed }
  }

  async function refreshCurrent(): Promise<void> {
    const quote = await fetchCurrentPrice(fetcher)
    // One failed refresh does not throw away a price fetched minutes ago:
    // only a session that never got one falls back to the reference.
    if (!quote && known.value.current.status === 'ok') return
    known.value = {
      ...known.value,
      current: quote ? { status: 'ok', ...quote } : { status: 'failed' },
    }
  }

  /** Closed months no source could price yet, asked again on each tick. */
  function retryFailed(): void {
    for (const [month, lookup] of known.value.closed) {
      if (lookup.status === 'failed') void loadMonth(month)
    }
  }

  function tick(): void {
    void refreshCurrent()
    retryFailed()
  }

  async function loadMonth(month: string): Promise<void> {
    const cached = readMonthPrice(month)
    if (cached !== null) {
      setClosed(month, { status: 'ok', usd: cached, source: 'coingecko-average' })
      return
    }
    setClosed(month, { status: 'pending' })
    const usd = await fetchMonthAverage(fetcher, month)
    if (usd === null) {
      setClosed(month, { status: 'failed' })
      return
    }
    writeMonthPrice(month, usd)
    setClosed(month, { status: 'ok', usd, source: 'coingecko-average' })
  }

  return {
    known,
    needClosed(months) {
      for (const month of months) {
        if (!known.value.closed.has(month)) void loadMonth(month)
      }
    },
    start() {
      if (timer) return
      void refreshCurrent()
      timer = setInterval(tick, PRICE.refreshMs)
    },
    stop() {
      if (timer) clearInterval(timer)
      timer = null
    },
  }
}

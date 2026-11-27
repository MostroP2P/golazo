import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { createPriceStore } from '~/price/store'
import { readMonthPrice, writeMonthPrice } from '~/price/cache'
import type { Fetch } from '~/price/fetch'

const settle = () => new Promise((r) => setTimeout(r, 0))

beforeEach(() => localStorage.clear())
afterEach(() => vi.useRealTimers())

function fetcher(body: unknown): Fetch & { calls: string[] } {
  const calls: string[] = []
  return Object.assign(
    (url: string) => {
      calls.push(url)
      return body === null
        ? Promise.reject(new Error('offline'))
        : Promise.resolve(new Response(JSON.stringify(body)))
    },
    { calls },
  )
}

describe('the price store', () => {
  test('fetches the live price on start and every five minutes', async () => {
    vi.useFakeTimers()
    const f = fetcher({ BTC: { USD: 91_000 } })
    const store = createPriceStore(f)

    store.start()
    store.start()
    await vi.advanceTimersByTimeAsync(1)
    expect(store.known.value.current).toEqual({
      status: 'ok',
      usd: 91_000,
      source: 'yadio',
    })
    expect(f.calls).toHaveLength(1)

    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)
    expect(f.calls).toHaveLength(2)
    store.stop()
    store.stop()
  })

  test('marks the live price failed when no source answers', async () => {
    const store = createPriceStore(fetcher(null))
    store.start()
    await settle()
    await settle()
    expect(store.known.value.current).toEqual({ status: 'failed' })
    store.stop()
  })

  test('fetches a closed month once, caches it, and serves the cache next time', async () => {
    const day = Date.UTC(2026, 11, 1)
    const f = fetcher({ prices: [[day, 60_000]] })
    const store = createPriceStore(f)

    store.needClosed(['2026-12'])
    expect(store.known.value.closed.get('2026-12')).toEqual({ status: 'pending' })
    await settle()
    await settle()
    store.needClosed(['2026-12'])

    expect(store.known.value.closed.get('2026-12')).toEqual({
      status: 'ok',
      usd: 60_000,
      source: 'coingecko-average',
    })
    expect(f.calls).toHaveLength(1)
    expect(readMonthPrice('2026-12')).toBe(60_000)

    const again = createPriceStore(fetcher(null))
    again.needClosed(['2026-12'])
    expect(again.known.value.closed.get('2026-12')).toMatchObject({
      status: 'ok',
      usd: 60_000,
    })
  })

  test('a month nobody can price is failed', async () => {
    const store = createPriceStore(fetcher(null))
    store.needClosed(['2026-12'])
    await settle()
    await settle()
    expect(store.known.value.closed.get('2026-12')).toEqual({ status: 'failed' })
  })
})

describe('the price cache', () => {
  test('ignores junk and survives storage that throws', () => {
    localStorage.setItem('golazo:price:2026-12', 'nope')
    expect(readMonthPrice('2026-12')).toBeNull()
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota')
    })
    expect(() => writeMonthPrice('2026-12', 1)).not.toThrow()
    spy.mockRestore()
    const get = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('denied')
    })
    expect(readMonthPrice('2026-12')).toBeNull()
    get.mockRestore()
  })
})

describe('recovering from price failures', () => {
  test('a failed refresh keeps the last good live price', async () => {
    vi.useFakeTimers()
    let up = true
    const f: Fetch = () =>
      up
        ? Promise.resolve(new Response(JSON.stringify({ BTC: { USD: 91_000 } })))
        : Promise.reject(new Error('offline'))
    const store = createPriceStore(f)
    store.start()
    await vi.advanceTimersByTimeAsync(1)

    up = false
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)

    expect(store.known.value.current).toEqual({
      status: 'ok',
      usd: 91_000,
      source: 'yadio',
    })
    store.stop()
  })

  test('a closed month no source could price is asked again on the next tick', async () => {
    vi.useFakeTimers()
    let up = false
    const day = Date.UTC(2026, 11, 1)
    const f: Fetch = (url) =>
      up
        ? Promise.resolve(
            new Response(
              JSON.stringify(
                url.includes('range') ? { prices: [[day, 62_000]] } : { BTC: { USD: 1 } },
              ),
            ),
          )
        : Promise.reject(new Error('429'))
    const store = createPriceStore(f)
    store.start()
    store.needClosed(['2026-12'])
    await vi.advanceTimersByTimeAsync(1)
    expect(store.known.value.closed.get('2026-12')).toEqual({ status: 'failed' })

    up = true
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000)

    expect(store.known.value.closed.get('2026-12')).toMatchObject({
      status: 'ok',
      usd: 62_000,
    })
    store.stop()
  })
})

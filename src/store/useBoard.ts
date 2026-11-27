/**
 * The app's state, as one hook: the shared store, the prices, and the board
 * built from them. Views read this and nothing else.
 */
import { useEffect, useMemo, useState } from 'preact/hooks'
import { PUBLISHER_PUBKEY } from '~/config'
import { openRelays, type RelayState } from '~/nostr/pool'
import { PLAN } from '~/plan/load'
import type { PlanResult } from '~/plan/types'
import { buildBoard, type Board } from '~/model/board'
import { neededDocuments } from '~/model/months'
import { createPriceStore, type PriceStore } from '~/price/store'
import type { KnownPrices } from '~/price/choose'
import { loadRelays } from './relays'
import {
  createStore,
  type BootState,
  type DocState,
  type Restated,
  type Store,
} from './store'
import { restatementsOf, sourceOf } from './sources'

let shared: { store: Store; prices: PriceStore } | null = null

function sharedState() {
  shared ??= {
    store: createStore(openRelays(loadRelays()), PUBLISHER_PUBKEY),
    prices: createPriceStore((url, init) => fetch(url, init)),
  }
  return shared
}

/** Drop the shared store, so a changed relay list takes effect. */
export function resetShared(): void {
  shared?.store.stop()
  shared?.prices.stop()
  shared = null
}

export type AppView = {
  readonly plan: PlanResult
  readonly boot: BootState
  readonly documents: ReadonlyMap<string, DocState>
  readonly relays: readonly RelayState[]
  readonly restated: ReadonlyMap<string, Restated>
  readonly prices: KnownPrices
  /** The archive's "now", `coverage.last_event_at`, once the index is in. */
  readonly now: number | null
  readonly needed: readonly string[]
  readonly board: Board | null
  readonly refresh: () => void
}

function snapshot(store: Store, prices: PriceStore) {
  return {
    boot: store.boot.value,
    documents: store.documents.value,
    relays: store.relays.value,
    restated: store.restated.value,
    prices: prices.known.value,
  }
}

export function useBoard(): AppView {
  const { store, prices } = useMemo(sharedState, [])
  const [state, setState] = useState(() => snapshot(store, prices))

  useEffect(() => {
    const read = () => setState(snapshot(store, prices))
    const stops = [
      store.boot.subscribe(read),
      store.documents.subscribe(read),
      store.relays.subscribe(read),
      store.restated.subscribe(read),
      prices.known.subscribe(read),
    ]
    void store.start()
    prices.start()
    // SPEC 3.4 step 7: back on the tab, check the index at once.
    const onVisible = () => {
      if (document.visibilityState === 'visible') void store.refresh()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      stops.forEach((stop) => stop())
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [store, prices])

  const now =
    state.boot.status === 'ready'
      ? Date.parse(state.boot.index.coverage.last_event_at)
      : null
  const plan = PLAN.ok ? PLAN.plan : null
  const needed = useMemo(
    () =>
      plan && now !== null && Number.isFinite(now) ? neededDocuments(plan, now) : [],
    [plan, now],
  )
  // SPEC 7.4: a new month adds its daily series to the subscription.
  const key = needed.join(' ')
  useEffect(() => {
    if (state.boot.status === 'ready' && key) void store.need(key.split(' '))
  }, [store, key, state.boot.status])

  const board = useMemo(() => {
    if (!plan || now === null || !Number.isFinite(now)) return null
    return buildBoard({
      plan,
      now,
      source: (d) => sourceOf(state.documents, d),
      prices: state.prices,
      restated: restatementsOf(state.restated),
    })
  }, [plan, now, state.documents, state.prices, state.restated])

  const closedKey =
    board?.rows
      .filter(
        (row) => row.phase === 'closed' && row.target && row.price?.source === 'pending',
      )
      .map((row) => row.month)
      .join(' ') ?? ''
  useEffect(() => {
    if (closedKey) prices.needClosed(closedKey.split(' '))
  }, [prices, closedKey])

  return {
    plan: PLAN,
    ...state,
    now,
    needed,
    board,
    refresh: () => void store.refresh(),
  }
}

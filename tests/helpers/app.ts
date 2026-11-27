/** An AppView built from the real snapshot, for rendering views without relays. */
import { readFileSync, readdirSync } from 'node:fs'
import type { Envelope, IndexDoc } from '~/nostr/documents'
import type { DocState, Restated } from '~/store/store'
import type { AppView } from '~/store/useBoard'
import type { KnownPrices } from '~/price/choose'
import type { PlanResult } from '~/plan/types'
import { buildBoard } from '~/model/board'
import { neededDocuments } from '~/model/months'
import { restatementsOf, sourceOf } from '~/store/sources'
import { realPlan } from './plan'

const DIR = 'tests/fixtures/snapshot'

type RawEvent = { tags: string[][]; content: string; created_at: number }

export function snapshot() {
  const events = readdirSync(DIR)
    .filter((f) => f !== 'manifest.json')
    .map((f) => JSON.parse(readFileSync(`${DIR}/${f}`, 'utf8')) as RawEvent)
  const dOf = (e: RawEvent) => e.tags.find((t) => t[0] === 'd')![1]!
  const indexEvent = events.find((e) => dOf(e) === 'index')!
  const index = JSON.parse(indexEvent.content) as IndexDoc
  const documents = new Map<string, DocState>()
  for (const event of events) {
    const d = dOf(event)
    const entry = index.documents.find((e) => e.d === d)
    if (!entry) continue
    documents.set(d, {
      status: 'live',
      envelope: JSON.parse(event.content) as Envelope,
      createdAt: event.created_at,
      entry,
      coverage: index.coverage.last_event_at,
    })
  }
  return { index, indexCreatedAt: indexEvent.created_at, documents }
}

type Options = {
  now?: number
  documents?: Map<string, DocState>
  prices?: KnownPrices
  restated?: Map<string, Restated>
  plan?: PlanResult
  createdAt?: number
}

export function appView(options: Options = {}): AppView {
  const snap = snapshot()
  const plan = realPlan()
  const now = options.now ?? Date.parse(snap.index.coverage.last_event_at)
  // A scenario set at another 'now' has documents that reach that far.
  const coverage = new Date(now).toISOString()
  const documents = new Map(
    [...(options.documents ?? snap.documents)].map(([d, state]) => [
      d,
      state.status === 'live' || state.status === 'cached'
        ? { ...state, coverage }
        : state,
    ]),
  )
  const prices = options.prices ?? {
    closed: new Map(),
    current: { status: 'ok', usd: 91_000, source: 'yadio' },
  }
  const restated = options.restated ?? new Map()
  return {
    plan: options.plan ?? { ok: true, plan },
    boot: {
      status: 'ready',
      index: snap.index,
      createdAt: options.createdAt ?? Math.floor(Date.now() / 1000),
    },
    documents,
    relays: [
      {
        url: 'wss://relay.mostro.network',
        status: 'live',
        newestAt: snap.indexCreatedAt,
      },
    ],
    restated,
    prices,
    now,
    needed: neededDocuments(plan, now),
    board: buildBoard({
      plan,
      now,
      source: (d) => sourceOf(documents, d),
      prices,
      restated: restatementsOf(restated),
    }),
    refresh: () => {},
  }
}

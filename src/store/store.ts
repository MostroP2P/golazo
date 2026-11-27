/**
 * What the views read: the client algorithm of SPEC 3.4, as state.
 *
 * Fetch and verify the index, ask for every document Golazo needs in one
 * `REQ`, check each against the hash the index names, and keep one standing
 * subscription to the index and those documents. The index is the trigger: a
 * document is shown only once an index naming its hash has arrived, and a new
 * index refetches exactly the documents whose hash moved.
 *
 * Views read this and never a relay; the relay layer never touches the DOM.
 */
import { signal, type Signal } from '@preact/signals'
import type { Event, Filter } from 'nostr-tools'
import { BESTIARIO_KIND, TIMEOUTS } from '~/config'
import type { Relays, RelayState } from '~/nostr/pool'
import { verifyDocument, verifyIndex, type Failure } from '~/nostr/verify'
import { canonicalPayload } from '~/nostr/canonical'
import { sha256Hex } from '~/nostr/hash'
import type { Envelope, IndexDoc, IndexEntry, Payload } from '~/nostr/documents'
import { backoffDelay } from './backoff'
import { openCache, readCached, writeCached } from './cache'

export type DocState =
  | { readonly status: 'loading' }
  | {
      readonly status: 'cached' | 'live'
      readonly envelope: Envelope
      /** The event's signed `created_at`, in seconds. */
      readonly createdAt: number
      readonly entry: IndexEntry
    }
  | { readonly status: 'unavailable' }
  | { readonly status: 'unverified'; readonly reason: Failure }

export type BootState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly index: IndexDoc; readonly createdAt: number }
  | { readonly status: 'failed'; readonly reason: Failure | 'timeout' }

/** A document whose revision rose while the reader was looking (SPEC 3.4 step 6). */
export type Restated = {
  readonly because: string
  readonly fromRevision: number
  readonly toRevision: number
  readonly previous: Payload
}

export type Store = {
  readonly boot: Signal<BootState>
  readonly documents: Signal<ReadonlyMap<string, DocState>>
  readonly relays: Signal<readonly RelayState[]>
  readonly restated: Signal<ReadonlyMap<string, Restated>>
  start(): Promise<void>
  /** Ensure these `d` values are loaded and followed. */
  need(ds: readonly string[]): Promise<void>
  /** Re-read the index now: the refresh button, and a tab coming back. */
  refresh(): Promise<void>
  stop(): void
}

export type Timers = {
  set(fn: () => void, ms: number): unknown
  clear(handle: unknown): void
}

const realTimers: Timers = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export const dOf = (event: Event): string | undefined =>
  event.tags.find((tag) => tag[0] === 'd')?.[1]

/** The newest event per `d`: a relay serving a stale replaceable event is normal. */
function newestPerD(events: readonly Event[]): Map<string, Event> {
  const newest = new Map<string, Event>()
  for (const event of events) {
    const d = dOf(event)
    if (!d) continue
    const held = newest.get(d)
    if (!held || event.created_at > held.created_at) newest.set(d, event)
  }
  return newest
}

function renderable(state: DocState | undefined) {
  return state?.status === 'live' || state?.status === 'cached' ? state : null
}

type Failed = {
  readonly entry: IndexEntry
  readonly reason: Failure | 'missing'
  readonly event?: Event
}

export function createStore(
  relays: Relays,
  publisher: string,
  timers: Timers = realTimers,
): Store {
  const boot = signal<BootState>({ status: 'loading' })
  const documents = signal<ReadonlyMap<string, DocState>>(new Map())
  const relayStates = signal<readonly RelayState[]>(relays.states())
  const restated = signal<ReadonlyMap<string, Restated>>(new Map())

  const wanted = new Set<string>()
  /** Documents that arrived before an index naming their hash (step 5). */
  const early = new Map<string, Event>()
  let unsubscribe: (() => void) | null = null
  let retry: unknown = null
  let attempt = 0
  let stopped = false

  const setDoc = (d: string, state: DocState) => {
    const next = new Map(documents.value)
    next.set(d, state)
    documents.value = next
  }
  const refreshRelays = () => {
    relayStates.value = relays.states()
  }
  const entryFor = (d: string): IndexEntry | undefined =>
    boot.value.status === 'ready'
      ? boot.value.index.documents.find((entry) => entry.d === d)
      : undefined

  function scheduleRetry(): void {
    if (stopped || retry !== null) return
    retry = timers.set(() => {
      retry = null
      void readIndex().then(subscribe)
    }, backoffDelay(attempt++))
  }

  /** Accept a verified document, noting a restatement if its revision rose. */
  function show(d: string, envelope: Envelope, createdAt: number, entry: IndexEntry) {
    const before = renderable(documents.value.get(d))
    if (before && envelope.revision > before.envelope.revision) {
      const next = new Map(restated.value)
      const first = restated.value.get(d)
      // The baseline is what the reader saw first: the yearly series is
      // republished with every update to the month in course, and comparing
      // only against the previous revision would make a restated closed month
      // look unchanged again within hours.
      next.set(d, {
        because: envelope.restated_because ?? 'revision',
        fromRevision: first?.fromRevision ?? before.envelope.revision,
        toRevision: envelope.revision,
        previous: first?.previous ?? before.envelope.payload,
      })
      restated.value = next
    }
    setDoc(d, { status: 'live', envelope, createdAt, entry })
    writeCached(d, { hash: entry.hash, envelope, createdAt })
  }

  async function accept(event: Event, entry: IndexEntry): Promise<Failure | null> {
    const verified = await verifyDocument(event, publisher, entry.hash)
    if (!verified.ok) return verified.reason
    // A newer index may have arrived while this was verifying; its own fetch
    // owns the document now, and an older payload must not overwrite it.
    if (entryFor(entry.d)?.hash !== entry.hash) return null
    show(entry.d, verified.value, event.created_at, entry)
    return null
  }

  async function queryDocs(ds: readonly string[]): Promise<Map<string, Event>> {
    const events = await relays.query(
      { kinds: [BESTIARIO_KIND], authors: [publisher], '#d': [...ds] },
      TIMEOUTS.document,
    )
    refreshRelays()
    return newestPerD(events)
  }

  async function verifyAll(
    entries: readonly IndexEntry[],
    events: Map<string, Event>,
  ): Promise<Failed[]> {
    const results = await Promise.all(
      entries.map(async (entry): Promise<Failed | null> => {
        const event = events.get(entry.d)
        if (!event) return { entry, reason: 'missing' }
        const reason = await accept(event, entry)
        return reason === null ? null : { entry, reason, event }
      }),
    )
    return results.filter((r) => r !== null)
  }

  /**
   * Storage is not a trust anchor: anything on the device can edit it. A
   * cached payload is shown only if its own bytes still hash to what the
   * signed index names — the stored `hash` field proves nothing.
   */
  async function cachedPayloadHolds(envelope: Envelope, hash: string): Promise<boolean> {
    try {
      return (await sha256Hex(canonicalPayload(envelope.payload))) === hash
    } catch {
      return false
    }
  }

  /** What needs a network round trip; everything else is served here. */
  async function settleLocally(d: string): Promise<IndexEntry | null> {
    const entry = entryFor(d)
    // A `d` the index does not name was never published: absent, not failed.
    if (!entry) {
      setDoc(d, { status: 'unavailable' })
      return null
    }
    const shown = renderable(documents.value.get(d))
    if (shown?.entry.hash === entry.hash) {
      early.delete(d)
      return null
    }
    const cached = readCached(d, entry.hash)
    if (cached && !shown && (await cachedPayloadHolds(cached.envelope, entry.hash))) {
      setDoc(d, { status: 'cached', ...cached, entry })
      return null
    }
    const held = early.get(d)
    if (held && (await accept(held, entry)) === null) {
      early.delete(d)
      return null
    }
    // A replacement in flight leaves the verified figure where it is.
    if (!shown) setDoc(d, { status: 'loading' })
    return entry
  }

  /** Steps 3–4: one REQ, verify each, ask once more for those whose hash failed. */
  async function fetchDocuments(ds: readonly string[]): Promise<void> {
    const settled = await Promise.all(ds.map(settleLocally))
    const pending = settled.filter((entry): entry is IndexEntry => entry !== null)
    if (pending.length === 0) return

    let failed = await verifyAll(pending, await queryDocs(pending.map((e) => e.d)))
    const mismatched = failed.filter((f) => f.reason === 'hash').map((f) => f.entry)
    if (mismatched.length > 0) {
      const second = await verifyAll(
        mismatched,
        await queryDocs(mismatched.map((e) => e.d)),
      )
      failed = [...failed.filter((f) => f.reason !== 'hash'), ...second]
    }
    for (const { entry, reason, event } of failed) {
      // A document ahead of its index may be the next index's: keep it.
      if (reason === 'hash' && event) early.set(entry.d, event)
      // Neither a relay's silence nor a document from another snapshot blanks
      // a verified figure already on screen.
      if (renderable(documents.value.get(entry.d))) continue
      setDoc(
        entry.d,
        reason === 'missing'
          ? { status: 'unavailable' }
          : { status: 'unverified', reason },
      )
    }
  }

  /** Apply a verified index if it is newer than the one held; refetch what moved. */
  async function applyIndex(event: Event): Promise<Failure | null> {
    const verified = verifyIndex(event, publisher)
    if (!verified.ok) return verified.reason
    const held = boot.value.status === 'ready' ? boot.value : null
    if (held && event.created_at <= held.createdAt) return null
    boot.value = { status: 'ready', index: verified.value, createdAt: event.created_at }
    if (!held) return null
    const before = new Map(held.index.documents.map((e) => [e.d, e.hash]))
    const moved = [...wanted].filter(
      (d) => before.get(d) !== entryFor(d)?.hash || early.has(d),
    )
    if (moved.length > 0) await fetchDocuments(moved)
    return null
  }

  async function readIndex(): Promise<void> {
    const events = await relays.query(
      { kinds: [BESTIARIO_KIND], authors: [publisher], '#d': ['index'], limit: 1 },
      TIMEOUTS.index,
    )
    refreshRelays()
    const newest = newestPerD(events).get('index')
    const failure = newest ? await applyIndex(newest) : 'timeout'
    if (failure === null) {
      // Any successful read, even of the index already held, ends a backoff.
      attempt = 0
      return
    }
    if (boot.value.status !== 'ready') boot.value = { status: 'failed', reason: failure }
    scheduleRetry()
  }

  function onEvent(event: Event): void {
    refreshRelays()
    const d = dOf(event)
    if (d === 'index') {
      void applyIndex(event)
      return
    }
    if (!d || !wanted.has(d)) return
    const entry = entryFor(d)
    if (!entry) {
      early.set(d, event)
      return
    }
    void accept(event, entry).then((failure) => {
      // Not the hash this index names: it may be the next index's, so keep it.
      if (failure === 'hash') early.set(d, event)
    })
  }

  /** Step 5: one standing subscription to the index and every wanted document. */
  function subscribe(): void {
    if (stopped) return
    unsubscribe?.()
    const filter: Filter = {
      kinds: [BESTIARIO_KIND],
      authors: [publisher],
      '#d': ['index', ...wanted],
      // From the held index's signed time, not the reader's clock: a clock
      // running ahead would skip everything published in between.
      since:
        boot.value.status === 'ready'
          ? boot.value.createdAt
          : Math.floor(Date.now() / 1000),
    }
    unsubscribe = relays.subscribe(filter, onEvent, () => {
      unsubscribe = null
      scheduleRetry()
    })
  }

  return {
    boot,
    documents,
    relays: relayStates,
    restated,

    async start() {
      openCache()
      await readIndex()
      subscribe()
    },

    async need(ds) {
      const fresh = ds.filter((d) => !wanted.has(d))
      for (const d of fresh) wanted.add(d)
      if (boot.value.status === 'ready') await fetchDocuments(ds)
      if (fresh.length > 0 && unsubscribe) subscribe()
    },

    async refresh() {
      await readIndex()
      if (boot.value.status === 'ready') await fetchDocuments([...wanted])
    },

    stop() {
      stopped = true
      unsubscribe?.()
      unsubscribe = null
      if (retry !== null) timers.clear(retry)
      retry = null
      relays.close()
    },
  }
}

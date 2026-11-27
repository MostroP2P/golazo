/**
 * A `Relays` for store tests, plus a test publisher.
 *
 * The fixtures are re-signed by a key generated here, content untouched, so
 * their payload hashes still match the real index — and a test can then sign
 * a *new* index or a restated document, which the real publisher's events
 * could never be turned into.
 */
import { readFileSync, readdirSync } from 'node:fs'
import {
  finalizeEvent,
  generateSecretKey,
  getPublicKey,
  type Event,
} from 'nostr-tools/pure'
import type { Filter } from 'nostr-tools'
import type { Relays, RelayState } from '~/nostr/pool'
import type { Envelope, IndexDoc } from '~/nostr/documents'
import { canonicalPayload } from '~/nostr/canonical'
import { sha256Hex } from '~/nostr/hash'

const DIR = 'tests/fixtures/snapshot'
const key = generateSecretKey()
export const TEST_PUBLISHER = getPublicKey(key)

export function sign(
  event: Pick<Event, 'kind' | 'created_at' | 'tags' | 'content'>,
): Event {
  return finalizeEvent({ ...event }, key)
}

export const dOf = (e: Event) => e.tags.find((t) => t[0] === 'd')?.[1] ?? ''

/** Every fixture, re-signed by the test publisher. */
export function resignedFixtures(): Event[] {
  return readdirSync(DIR)
    .filter((file) => file !== 'manifest.json')
    .map((file) => sign(JSON.parse(readFileSync(`${DIR}/${file}`, 'utf8')) as Event))
}

export function indexOf(events: readonly Event[]): IndexDoc {
  return JSON.parse(events.find((e) => dOf(e) === 'index')!.content) as IndexDoc
}

/** A newer index, with the entries for some `d` replaced. */
export function nextIndex(
  events: readonly Event[],
  entries: Record<string, { hash: string; revision: number }>,
  createdAt: number,
): Event {
  const index = indexOf(events)
  const documents = index.documents.map((e) =>
    entries[e.d] ? { ...e, ...entries[e.d] } : e,
  )
  return sign({
    kind: 30666,
    created_at: createdAt,
    tags: [['d', 'index']],
    content: JSON.stringify({ ...index, documents }),
  })
}

/** The same document with its envelope changed, re-signed; and its new hash. */
export async function restate(
  event: Event,
  change: (envelope: Envelope) => Envelope,
  createdAt: number,
): Promise<{ event: Event; hash: string; revision: number }> {
  const envelope = change(JSON.parse(event.content) as Envelope)
  return {
    event: sign({ ...event, created_at: createdAt, content: JSON.stringify(envelope) }),
    hash: await sha256Hex(canonicalPayload(envelope.payload)),
    revision: envelope.revision,
  }
}

function matches(event: Event, filter: Filter): boolean {
  if (filter.kinds && !filter.kinds.includes(event.kind)) return false
  if (filter.authors && !filter.authors.includes(event.pubkey)) return false
  const ds = filter['#d']
  return !ds || ds.includes(dOf(event))
}

export type FakeRelays = Relays & {
  events: Event[]
  queries: Filter[]
  subscriptions: {
    filter: Filter
    onEvent: (e: Event) => void
    onClose?: (r: string[]) => void
    closed: boolean
  }[]
  closed: boolean
  /** Push an event to every open subscription that matches. */
  push(event: Event): void
}

export function fakeRelays(events: Event[]): FakeRelays {
  const relays: FakeRelays = {
    events,
    queries: [],
    subscriptions: [],
    closed: false,
    query(filter) {
      relays.queries.push(filter)
      return Promise.resolve(relays.events.filter((e) => matches(e, filter)))
    },
    subscribe(filter, onEvent, onClose) {
      const sub = {
        filter,
        onEvent,
        closed: false,
        ...(onClose ? { onClose } : {}),
      }
      relays.subscriptions.push(sub)
      return () => {
        sub.closed = true
      }
    },
    states(): RelayState[] {
      return [{ url: 'wss://fake', status: 'live', newestAt: null }]
    },
    close() {
      relays.closed = true
    },
    push(event) {
      for (const sub of relays.subscriptions) {
        if (!sub.closed && matches(event, sub.filter)) sub.onEvent(event)
      }
    },
  }
  return relays
}

export function manualTimers() {
  const scheduled: { fn: () => void; ms: number; cleared: boolean }[] = []
  return {
    scheduled,
    set(fn: () => void, ms: number) {
      const handle = { fn, ms, cleared: false }
      scheduled.push(handle)
      return handle
    },
    clear(handle: unknown) {
      ;(handle as { cleared: boolean }).cleared = true
    },
    /** Run every pending timer once. */
    flush() {
      for (const handle of scheduled.splice(0)) if (!handle.cleared) handle.fn()
    },
  }
}

/** Wait for queued promise chains to settle. */
export const settle = () => new Promise((resolve) => setTimeout(resolve, 0))

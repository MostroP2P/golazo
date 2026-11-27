/**
 * A stand-in for nostr-tools' SimplePool, shared by the relay-layer tests.
 *
 * A test file installs it with
 * `vi.mock('nostr-tools/pool', async () => ({ SimplePool: (await import('./fake-pool')).FakePool }))`
 * and sets `behaviour` before opening relays. `resetBehaviour()` runs before
 * each test so no file inherits another's relay.
 */
import type { Event, Filter } from 'nostr-tools'

export type QueryOptions = { maxWait?: number }

/** What the fake SimplePool will do. Set per test before opening relays. */
export const behaviour: {
  query: (filter: Filter, relays: string[], opts: QueryOptions) => Promise<Event[]>
  subscribeCalls: {
    filter: Filter
    onevent: (event: Event) => void
    onclose: (reasons: { url: string; reason: string }[]) => void
  }[]
  closed: string[][]
  subscriptionsClosed: number
  /** Which relays deliver the events; all of them when unset. */
  deliveredBy?: string[] | undefined
} = {
  query: () => Promise.resolve([]),
  subscribeCalls: [],
  closed: [],
  subscriptionsClosed: 0,
}

export function resetBehaviour(): void {
  behaviour.query = () => Promise.resolve([])
  behaviour.subscribeCalls = []
  behaviour.closed = []
  behaviour.subscriptionsClosed = 0
  behaviour.deliveredBy = undefined
}

export class FakePool {
  trackRelays = false
  /** As in nostr-tools: every relay that delivered an event, by event id. */
  seenOn = new Map<string, Set<{ url: string }>>()

  private record(events: readonly Event[], relays: readonly string[]) {
    const from = behaviour.deliveredBy ?? relays
    for (const event of events) {
      const urls = relays.filter((r) => from.includes(r))
      if (urls.length === 0) continue
      const set = this.seenOn.get(event.id) ?? new Set()
      for (const url of urls) set.add({ url: `${url}/` })
      this.seenOn.set(event.id, set)
    }
  }

  async querySync(relays: string[], filter: Filter, opts: QueryOptions = {}) {
    const events = await behaviour.query(filter, relays, opts)
    this.record(events, relays)
    return events
  }
  subscribe(
    relays: string[],
    filter: Filter,
    handlers: {
      onevent: (e: Event) => void
      onclose: (reasons: { url: string; reason: string }[]) => void
    },
  ) {
    behaviour.subscribeCalls.push({
      filter,
      onevent: (event) => {
        this.record([event], relays)
        handlers.onevent(event)
      },
      onclose: handlers.onclose,
    })
    return {
      close: () => {
        behaviour.subscriptionsClosed++
      },
    }
  }
  close(relays: string[]) {
    behaviour.closed.push(relays)
  }
}

export function event(createdAt: number): Event {
  return {
    id: 'x',
    pubkey: 'p',
    created_at: createdAt,
    kind: 30666,
    tags: [['d', 'index']],
    content: '{}',
    sig: 's',
  }
}

import { beforeEach, describe, expect, test } from 'vitest'
import type { Event } from 'nostr-tools'
import { createStore } from '~/store/store'
import { clearCache } from '~/store/cache'
import {
  TEST_PUBLISHER,
  dOf,
  fakeRelays,
  indexOf,
  manualTimers,
  nextIndex,
  resignedFixtures,
  restate,
  settle,
  sign,
} from './fake-relays'

const DEV_FEES = 'series:dev-fees:monthly:2026'
const SUMMARY = 'summary:30d'

let events: Event[]
beforeEach(() => {
  localStorage.clear()
  clearCache()
  events = resignedFixtures()
})

const indexEvent = () => events.find((e) => dOf(e) === 'index')!
const docEvent = (d: string) => events.find((e) => dOf(e) === d)!

describe('boot', () => {
  test('verifies the index and becomes ready', async () => {
    const store = createStore(fakeRelays(events), TEST_PUBLISHER)
    await store.start()
    expect(store.boot.value.status).toBe('ready')
  })

  test('fails with a timeout when no relay has an index, and retries with backoff', async () => {
    // Arrange
    const relays = fakeRelays([])
    const timers = manualTimers()
    const store = createStore(relays, TEST_PUBLISHER, timers)

    // Act
    await store.start()

    // Assert
    expect(store.boot.value).toEqual({ status: 'failed', reason: 'timeout' })
    expect(timers.scheduled).toHaveLength(1)
    expect(timers.scheduled[0]!.ms).toBeGreaterThanOrEqual(350)
    expect(timers.scheduled[0]!.ms).toBeLessThanOrEqual(650)

    // The relay comes back: the retry finds the index.
    relays.events = events
    timers.flush()
    await settle()
    expect(store.boot.value.status).toBe('ready')
  })

  test('refuses an index signed by someone else', async () => {
    // A relay that ignores the author filter and hands over the index anyway.
    const relays = fakeRelays(events)
    relays.query = () => Promise.resolve(events.filter((e) => dOf(e) === 'index'))
    const store = createStore(relays, '0'.repeat(64), manualTimers())
    await store.start()
    expect(store.boot.value).toEqual({ status: 'failed', reason: 'author' })
  })
})

describe('documents', () => {
  test('asks for every needed document in one REQ and verifies each', async () => {
    // Arrange
    const relays = fakeRelays(events)
    const store = createStore(relays, TEST_PUBLISHER)
    await store.start()

    // Act
    await store.need([DEV_FEES, SUMMARY])

    // Assert
    expect(relays.queries.at(-1)!['#d']).toEqual([DEV_FEES, SUMMARY])
    expect(store.documents.value.get(DEV_FEES)?.status).toBe('live')
    expect(store.documents.value.get(SUMMARY)?.status).toBe('live')
  })

  test('a document the index does not name is unavailable, and nothing is asked', async () => {
    const relays = fakeRelays(events)
    const store = createStore(relays, TEST_PUBLISHER)
    await store.start()
    const before = relays.queries.length

    await store.need(['series:dev-fees:monthly:2027'])

    expect(store.documents.value.get('series:dev-fees:monthly:2027')).toEqual({
      status: 'unavailable',
    })
    expect(relays.queries).toHaveLength(before)
  })

  test('a named document no relay delivers is unavailable', async () => {
    const store = createStore(
      fakeRelays(events.filter((e) => dOf(e) !== DEV_FEES)),
      TEST_PUBLISHER,
    )
    await store.start()
    await store.need([DEV_FEES])
    expect(store.documents.value.get(DEV_FEES)).toEqual({ status: 'unavailable' })
  })

  test('a document altered under its signature is unverified: signature', async () => {
    const original = docEvent(SUMMARY)
    const tampered = {
      ...original,
      content: original.content.replace('"value":10', '"value":11'),
    }
    const store = createStore(
      fakeRelays([...events.filter((e) => e !== original), tampered]),
      TEST_PUBLISHER,
    )
    await store.start()
    await store.need([SUMMARY])
    expect(store.documents.value.get(SUMMARY)).toEqual({
      status: 'unverified',
      reason: 'signature',
    })
  })

  test('a hash mismatch is asked once more, then left unverified: hash', async () => {
    // Arrange: a validly signed document from another snapshot.
    const other = await restate(
      docEvent(SUMMARY),
      (e) => ({
        ...e,
        revision: e.revision + 1,
        payload: { ...e.payload, range: { from: 'x', until: 'y' } },
      }),
      1,
    )
    const relays = fakeRelays([...events.filter((e) => dOf(e) !== SUMMARY), other.event])
    const store = createStore(relays, TEST_PUBLISHER)
    await store.start()
    const before = relays.queries.length

    // Act
    await store.need([SUMMARY])

    // Assert
    expect(relays.queries.length - before).toBe(2)
    expect(store.documents.value.get(SUMMARY)).toEqual({
      status: 'unverified',
      reason: 'hash',
    })
  })

  test('a second store serves a document from cache while the hash matches', async () => {
    const first = createStore(fakeRelays(events), TEST_PUBLISHER)
    await first.start()
    await first.need([DEV_FEES])

    const relays = fakeRelays(events)
    const second = createStore(relays, TEST_PUBLISHER)
    await second.start()
    const before = relays.queries.length
    await second.need([DEV_FEES])

    expect(second.documents.value.get(DEV_FEES)?.status).toBe('cached')
    expect(relays.queries).toHaveLength(before)
  })

  test('asking again for a document already shown costs nothing', async () => {
    const relays = fakeRelays(events)
    const store = createStore(relays, TEST_PUBLISHER)
    await store.start()
    await store.need([DEV_FEES])
    const before = relays.queries.length
    await store.need([DEV_FEES])
    expect(relays.queries).toHaveLength(before)
  })

  test('documents asked before the index are fetched by refresh', async () => {
    const relays = fakeRelays(events)
    const store = createStore(relays, TEST_PUBLISHER)
    await store.need([SUMMARY])
    expect(store.documents.value.size).toBe(0)
    await store.refresh()
    expect(store.documents.value.get(SUMMARY)?.status).toBe('live')
  })
})

describe('real time: the index is the trigger', () => {
  async function started() {
    const relays = fakeRelays(events)
    const store = createStore(relays, TEST_PUBLISHER, manualTimers())
    await store.start()
    await store.need([DEV_FEES, SUMMARY])
    return { relays, store }
  }

  test('subscribes to the index and every needed document', async () => {
    const { relays } = await started()
    const open = relays.subscriptions.filter((s) => !s.closed)
    expect(open).toHaveLength(1)
    expect(open[0]!.filter['#d']).toEqual(['index', DEV_FEES, SUMMARY])
  })

  test('a restated document arriving before its index waits for it, then shows as re-calculated', async () => {
    // Arrange
    const { relays, store } = await started()
    const created = indexEvent().created_at + 60
    const next = await restate(
      docEvent(DEV_FEES),
      (e) => ({
        ...e,
        revision: e.revision + 1,
        restated_because: 'backfill',
        payload: {
          ...e.payload,
          period: {
            ...('period' in e.payload ? e.payload.period : { from: '', until: '' }),
            until: 'later',
          },
        },
      }),
      created,
    )

    // Act 1: the document alone.
    relays.push(next.event)
    await settle()

    // Assert 1: not shown, because no index names it yet.
    const shown = store.documents.value.get(DEV_FEES)
    expect(shown?.status === 'live' && shown.envelope.revision).toBe(next.revision - 1)

    // Act 2: its index.
    relays.push(nextIndex(events, { [DEV_FEES]: next }, created))
    await settle()
    await settle()

    // Assert 2
    const after = store.documents.value.get(DEV_FEES)
    expect(after?.status === 'live' && after.envelope.revision).toBe(next.revision)
    expect(store.restated.value.get(DEV_FEES)).toMatchObject({
      because: 'backfill',
      fromRevision: next.revision - 1,
      toRevision: next.revision,
    })
  })

  test('a new index refetches only the documents whose hash moved', async () => {
    // Arrange
    const { relays, store } = await started()
    const created = indexEvent().created_at + 60
    const next = await restate(
      docEvent(SUMMARY),
      (e) => ({ ...e, revision: e.revision + 1 }),
      created,
    )
    relays.events = [...relays.events.filter((e) => dOf(e) !== SUMMARY), next.event]
    const before = relays.queries.length

    // Act: same payload, so the hash does not move — nothing to refetch.
    relays.push(
      nextIndex(
        events,
        { [SUMMARY]: { hash: next.hash, revision: next.revision } },
        created,
      ),
    )
    await settle()

    // Assert
    expect(relays.queries).toHaveLength(before)
    expect(store.boot.value.status === 'ready' && store.boot.value.createdAt).toBe(
      created,
    )
  })

  test('a moved hash is fetched and swapped in without blanking the figure', async () => {
    const { relays, store } = await started()
    const created = indexEvent().created_at + 60
    const next = await restate(
      docEvent(SUMMARY),
      (e) => ({
        ...e,
        revision: e.revision + 1,
        payload: { ...e.payload, range: { from: 'a', until: 'b' } },
      }),
      created,
    )
    relays.events = [...relays.events.filter((e) => dOf(e) !== SUMMARY), next.event]

    relays.push(nextIndex(events, { [SUMMARY]: next }, created))
    await settle()
    await settle()

    const doc = store.documents.value.get(SUMMARY)
    expect(doc?.status === 'live' && doc.envelope.revision).toBe(next.revision)
    expect(store.restated.value.get(SUMMARY)?.because).toBe('backfill')
  })

  test('an older index is ignored, and one from another key changes nothing', async () => {
    const { relays, store } = await started()
    const held = store.boot.value
    relays.push(nextIndex(events, {}, indexEvent().created_at - 10))
    relays.push({ ...indexEvent(), pubkey: '1'.repeat(64) })
    await settle()
    expect(store.boot.value).toBe(held)
  })

  test('a document nobody asked for, or without a d, is ignored', async () => {
    const { relays, store } = await started()
    const before = store.documents.value
    relays.subscriptions[0]!.onEvent(
      sign({ kind: 30666, created_at: 1, tags: [], content: '{}' }),
    )
    relays.subscriptions[0]!.onEvent(docEvent('volume:30d'))
    await settle()
    expect(store.documents.value).toBe(before)
  })

  test('a live document matching the held index is accepted at once', async () => {
    const relays = fakeRelays(events.filter((e) => dOf(e) !== SUMMARY))
    const store = createStore(relays, TEST_PUBLISHER, manualTimers())
    await store.start()
    await store.need([SUMMARY])
    expect(store.documents.value.get(SUMMARY)?.status).toBe('unavailable')

    relays.push(docEvent(SUMMARY))
    await settle()

    expect(store.documents.value.get(SUMMARY)?.status).toBe('live')
  })

  test('a document arriving before any index is held until one names it', async () => {
    const relays = fakeRelays([])
    const timers = manualTimers()
    const store = createStore(relays, TEST_PUBLISHER, timers)
    await store.start()
    await store.need([SUMMARY])
    relays.subscriptions[0]!.onEvent(docEvent(SUMMARY))

    relays.events = events.filter((e) => dOf(e) === 'index')
    await store.refresh()

    expect(store.documents.value.get(SUMMARY)?.status).toBe('live')
  })

  test('a dropped subscription is reopened after a backoff', async () => {
    // Arrange
    const relays = fakeRelays(events)
    const timers = manualTimers()
    const store = createStore(relays, TEST_PUBLISHER, timers)
    await store.start()

    // Act
    relays.subscriptions[0]!.closed = true
    relays.subscriptions[0]!.onClose?.(['connection lost'])
    timers.flush()
    await settle()

    // Assert
    expect(relays.subscriptions.filter((s) => !s.closed)).toHaveLength(1)
    expect(relays.subscriptions).toHaveLength(2)
  })

  test('stop closes the relays and any pending retry', async () => {
    const relays = fakeRelays([])
    const timers = manualTimers()
    const store = createStore(relays, TEST_PUBLISHER, timers)
    await store.start()

    store.stop()

    expect(relays.closed).toBe(true)
    expect(timers.scheduled[0]!.cleared).toBe(true)
    expect(relays.subscriptions.every((s) => s.closed)).toBe(true)
  })

  test('the restated index entry keeps the real index shape', () => {
    expect(indexOf(events).documents.length).toBeGreaterThan(10)
  })
})

describe('review fixes', () => {
  test('a document from a newer snapshot never blanks the verified figure, and waits for its index', async () => {
    // Arrange: SUMMARY is on screen; bestiario republishes it before its index.
    const relays = fakeRelays(events)
    const store = createStore(relays, TEST_PUBLISHER, manualTimers())
    await store.start()
    await store.need([SUMMARY])
    const created = indexEvent().created_at + 60
    const next = await restate(
      docEvent(SUMMARY),
      (e) => ({
        ...e,
        revision: e.revision + 1,
        payload: { ...e.payload, range: { from: 'n', until: 'n' } },
      }),
      created,
    )
    relays.events = [...relays.events.filter((e) => dOf(e) !== SUMMARY), next.event]
    localStorage.clear()

    // Act 1: a refresh against the same index meets only the newer document.
    const shown = store.documents.value.get(SUMMARY)
    const fresh = createStore(relays, TEST_PUBLISHER, manualTimers())
    await fresh.start()
    await fresh.need([SUMMARY])

    // Assert 1: with nothing on screen the spec's verdict stands — unverified.
    expect(fresh.documents.value.get(SUMMARY)).toEqual({
      status: 'unverified',
      reason: 'hash',
    })

    // Act 2: the store that had a figure keeps it through a forced refetch.
    store.documents.value = new Map([
      [
        SUMMARY,
        {
          ...shown!,
          entry: { ...(shown as { entry: { hash: string } }).entry, hash: 'stale' },
        } as never,
      ],
    ])
    await store.need([SUMMARY])
    expect(store.documents.value.get(SUMMARY)?.status).toBe('live')

    // Act 3: the index naming it arrives; the held document is used without asking again.
    const before = relays.queries.length
    relays.push(nextIndex(events, { [SUMMARY]: next }, created))
    await settle()
    await settle()
    const doc = store.documents.value.get(SUMMARY)
    expect(doc?.status === 'live' && doc.envelope.revision).toBe(next.revision)
    expect(relays.queries).toHaveLength(before)
  })

  test('a restatement keeps the revision the reader saw first', async () => {
    // Arrange
    const relays = fakeRelays(events)
    const store = createStore(relays, TEST_PUBLISHER, manualTimers())
    await store.start()
    await store.need([SUMMARY])
    const original = store.documents.value.get(SUMMARY)
    const firstRevision = original?.status === 'live' ? original.envelope.revision : -1
    let created = indexEvent().created_at

    // Act: two republications in a row.
    for (const step of [1, 2]) {
      created += 60
      const next = await restate(
        docEvent(SUMMARY),
        (e) => ({
          ...e,
          revision: e.revision + step,
          payload: { ...e.payload, range: { from: `${step}`, until: 'x' } },
        }),
        created,
      )
      relays.events = [...relays.events.filter((e) => dOf(e) !== SUMMARY), next.event]
      relays.push(nextIndex(events, { [SUMMARY]: next }, created))
      await settle()
      await settle()
    }

    // Assert
    const restated = store.restated.value.get(SUMMARY)!
    expect(restated.fromRevision).toBe(firstRevision)
    expect(restated.toRevision).toBe(firstRevision + 2)
    expect(original?.status === 'live' && restated.previous).toBe(
      original?.status === 'live' ? original.envelope.payload : null,
    )
  })

  test('subscribes from the held index’s signed time, not the reader’s clock', async () => {
    const relays = fakeRelays(events)
    const store = createStore(relays, TEST_PUBLISHER, manualTimers())
    await store.start()
    expect(relays.subscriptions[0]!.filter.since).toBe(indexEvent().created_at)
  })

  test('a successful reconnect ends the backoff, even with the same index', async () => {
    // Arrange: one failure grows the delay.
    const relays = fakeRelays([])
    const timers = manualTimers()
    const store = createStore(relays, TEST_PUBLISHER, timers)
    await store.start()
    relays.events = events
    timers.flush()
    await settle()

    // Act: the subscription drops twice; each reconnect succeeds.
    for (let drop = 0; drop < 2; drop++) {
      const open = relays.subscriptions.filter((s) => !s.closed).at(-1)!
      open.closed = true
      open.onClose?.(['dropped'])
      expect(timers.scheduled.at(-1)!.ms).toBeLessThanOrEqual(650)
      timers.flush()
      await settle()
    }

    // Assert
    expect(store.boot.value.status).toBe('ready')
  })
})

describe('Codex review on #1', () => {
  test('a cached payload edited under its stored hash is not shown; the network copy is', async () => {
    // Arrange: a first store caches the summary, then the cached figure is edited.
    const first = createStore(fakeRelays(events), TEST_PUBLISHER)
    await first.start()
    await first.need([SUMMARY])
    const key = `golazo:doc:${SUMMARY}`
    localStorage.setItem(
      key,
      localStorage.getItem(key)!.replace('"value":10', '"value":99'),
    )

    // Act
    const relays = fakeRelays(events)
    const second = createStore(relays, TEST_PUBLISHER)
    await second.start()
    const before = relays.queries.length
    await second.need([SUMMARY])

    // Assert
    const doc = second.documents.value.get(SUMMARY)
    expect(doc?.status).toBe('live')
    expect(JSON.stringify(doc?.status === 'live' && doc.envelope.payload)).not.toContain(
      '"value":99',
    )
    expect(relays.queries.length).toBeGreaterThan(before)
  })

  test('a slow answer verified against an older index never overwrites the newer document', async () => {
    // Arrange: the first document query hangs until released.
    const relays = fakeRelays(events)
    const store = createStore(relays, TEST_PUBLISHER, manualTimers())
    await store.start()
    const original = relays.query.bind(relays)
    let release: () => void = () => {}
    let held = true
    relays.query = (filter, timeout) => {
      if (held && filter['#d']?.includes(SUMMARY)) {
        held = false
        const answer = original(filter, timeout)
        return new Promise((resolve) => {
          release = () => void answer.then(resolve)
        })
      }
      return original(filter, timeout)
    }
    const oldEvents = [...relays.events]
    const slow = store.need([SUMMARY])

    // Act: a newer index and document arrive and are applied first.
    const created = indexEvent().created_at + 60
    const next = await restate(
      docEvent(SUMMARY),
      (e) => ({
        ...e,
        revision: e.revision + 1,
        payload: { ...e.payload, range: { from: 'new', until: 'new' } },
      }),
      created,
    )
    relays.events = [...oldEvents.filter((e) => dOf(e) !== SUMMARY), next.event]
    relays.push(nextIndex(events, { [SUMMARY]: next }, created))
    await settle()
    await settle()
    // The slow query was asked before the new document existed: it answers the old one.
    relays.events = oldEvents
    release()
    await slow

    // Assert
    const doc = store.documents.value.get(SUMMARY)
    expect(doc?.status === 'live' && doc.envelope.revision).toBe(next.revision)
  })
})

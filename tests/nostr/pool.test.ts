import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { Event } from 'nostr-tools'
import { behaviour, event, resetBehaviour } from './fake-pool'

vi.mock('nostr-tools/pool', async () => ({
  SimplePool: (await import('./fake-pool')).FakePool,
}))

const { openRelays } = await import('~/nostr/pool')

const RELAYS = ['wss://one', 'wss://two']

beforeEach(resetBehaviour)

afterEach(() => vi.clearAllMocks())

describe('openRelays', () => {
  test('starts with every relay connecting and nothing heard from', () => {
    const relays = openRelays(RELAYS)

    expect(relays.states()).toEqual([
      { url: 'wss://one', status: 'connecting', newestAt: null },
      { url: 'wss://two', status: 'connecting', newestAt: null },
    ])
  })

  test('returns what the relays hold', async () => {
    // Arrange
    behaviour.query = () => Promise.resolve([event(100)])
    const relays = openRelays(RELAYS)

    // Act
    const events = await relays.query({ kinds: [30666] })

    // Assert
    expect(events).toHaveLength(1)
  })

  test('records the newest event a relay supplied, for the age on screen', async () => {
    behaviour.query = () => Promise.resolve([event(100), event(400), event(250)])
    const relays = openRelays(RELAYS)

    await relays.query({ kinds: [30666] })

    for (const state of relays.states()) {
      expect(state.status).toBe('live')
      expect(state.newestAt).toBe(400)
    }
  })

  test('marks live only the relay that delivered the events; the other is silent', async () => {
    // Arrange
    behaviour.query = () => Promise.resolve([event(400)])
    behaviour.deliveredBy = ['wss://one']
    const relays = openRelays(RELAYS)

    // Act
    await relays.query({ kinds: [30666] })

    // Assert
    expect(relays.states()).toEqual([
      { url: 'wss://one', status: 'live', newestAt: 400 },
      { url: 'wss://two', status: 'silent', newestAt: null },
    ])
  })

  test('credits no relay for an event none is recorded as delivering', async () => {
    behaviour.query = () => Promise.resolve([event(400)])
    behaviour.deliveredBy = []
    const relays = openRelays(RELAYS)

    await relays.query({ kinds: [30666] })

    expect(relays.states().map((s) => s.status)).toEqual(['silent', 'silent'])
  })

  test('calls a relay silent when it answers with nothing', async () => {
    // Silence is not failure: a relay may simply not hold the document.
    const relays = openRelays(RELAYS)

    await relays.query({ kinds: [30666] })

    expect(relays.states().map((s) => s.status)).toEqual(['silent', 'silent'])
  })

  test('does not downgrade a relay that has already answered', async () => {
    behaviour.query = () => Promise.resolve([event(100)])
    const relays = openRelays(RELAYS)
    await relays.query({ kinds: [30666] })

    behaviour.query = () => Promise.resolve([])
    await relays.query({ kinds: [30666] })

    expect(relays.states().map((s) => s.status)).toEqual(['live', 'live'])
  })

  test('reports a failure with its reason and returns no events', async () => {
    behaviour.query = () => Promise.reject(new Error('socket hang up'))
    const relays = openRelays(RELAYS)

    const events = await relays.query({ kinds: [30666] })

    expect(events).toEqual([])
    expect(relays.states()[0]).toMatchObject({
      status: 'failed',
      error: 'socket hang up',
    })
  })

  test('survives a rejection that is not an Error', async () => {
    // A relay library that throws a string is exactly what the fallback
    // exists for, so the test has to be able to produce one.
    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
    behaviour.query = () => Promise.reject('nope')
    const relays = openRelays(RELAYS)

    await relays.query({ kinds: [30666] })

    expect(relays.states()[0]).toMatchObject({ status: 'failed', error: 'unknown error' })
  })

  test('leaves a failed relay failed rather than reviving it on silence', async () => {
    behaviour.query = () => Promise.reject(new Error('down'))
    const relays = openRelays(RELAYS)
    await relays.query({ kinds: [30666] })

    behaviour.query = () => Promise.resolve([event(10)])
    await relays.query({ kinds: [30666] })

    expect(relays.states().map((s) => s.status)).toEqual(['failed', 'failed'])
  })
})

describe('subscriptions', () => {
  test('passes events through and records having heard them', () => {
    // Arrange
    const relays = openRelays(RELAYS)
    const seen: Event[] = []

    // Act
    relays.subscribe({ kinds: [30666] }, (e) => seen.push(e))
    behaviour.subscribeCalls[0]!.onevent(event(900))

    // Assert
    expect(seen).toHaveLength(1)
    expect(relays.states()[0]).toMatchObject({ status: 'live', newestAt: 900 })
  })

  test('closes the subscription when told to', () => {
    const relays = openRelays(RELAYS)

    relays.subscribe({ kinds: [30666] }, () => {})()

    expect(behaviour.subscriptionsClosed).toBe(1)
  })

  test('reports a close the relays made, so the caller can resubscribe', () => {
    const relays = openRelays(RELAYS)
    const reasons: string[][] = []

    relays.subscribe(
      { kinds: [30666] },
      () => {},
      (r) => reasons.push(r),
    )
    behaviour.subscribeCalls[0]!.onclose([{ url: 'wss://a', reason: 'connection lost' }])

    expect(reasons).toEqual([['wss://a: connection lost']])
  })

  test('does not report a close the caller asked for', () => {
    const relays = openRelays(RELAYS)
    const reasons: string[][] = []

    const unsubscribe = relays.subscribe(
      { kinds: [30666] },
      () => {},
      (r) => reasons.push(r),
    )
    unsubscribe()
    behaviour.subscribeCalls[0]!.onclose([{ url: 'wss://a', reason: 'closed by caller' }])

    expect(reasons).toEqual([])
  })

  test('tolerates a close with nobody listening', () => {
    const relays = openRelays(RELAYS)

    relays.subscribe({ kinds: [30666] }, () => {})
    behaviour.subscribeCalls[0]!.onclose([{ url: 'wss://a', reason: 'gone' }])

    expect(behaviour.subscriptionsClosed).toBe(0)
  })
})

describe('close', () => {
  test('closes every relay it opened', () => {
    const relays = openRelays(RELAYS)

    relays.close()

    expect(behaviour.closed).toEqual([RELAYS])
  })
})

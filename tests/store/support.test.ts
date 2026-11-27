import { beforeEach, describe, expect, test } from 'vitest'
import { backoffDelay } from '~/store/backoff'
import { connectionOf, stalenessOf } from '~/store/connection'
import { isCustom, isRelayUrl, loadRelays, resetRelays, saveRelays } from '~/store/relays'
import { DEFAULT_RELAYS } from '~/config'
import type { RelayState } from '~/nostr/pool'
import type { DocState } from '~/store/store'

describe('backoffDelay (SPEC 3.4 step 7)', () => {
  test('starts at 500 ms and doubles', () => {
    const middle = () => 0.5
    expect(backoffDelay(0, middle)).toBe(500)
    expect(backoffDelay(1, middle)).toBe(1000)
    expect(backoffDelay(3, middle)).toBe(4000)
  })

  test('never exceeds 30 s, whatever the jitter', () => {
    expect(backoffDelay(20, () => 1)).toBe(30_000)
    expect(backoffDelay(20, () => 0)).toBe(21_000)
  })

  test('jitters within 30 % either way', () => {
    expect(backoffDelay(0, () => 0)).toBe(350)
    expect(backoffDelay(0, () => 1)).toBe(650)
    expect(backoffDelay(-2, () => 0.5)).toBe(500)
  })

  test('uses Math.random by default', () => {
    const delay = backoffDelay(0)
    expect(delay).toBeGreaterThanOrEqual(350)
    expect(delay).toBeLessThanOrEqual(650)
  })
})

const relay = (status: RelayState['status']): RelayState => ({
  url: 'wss://x',
  status,
  newestAt: null,
})
const ready = {
  status: 'ready',
  index: {} as never,
  createdAt: 1,
} as const
const cachedDoc = new Map<string, DocState>([
  ['d', { status: 'cached', envelope: {} as never, createdAt: 1, entry: {} as never }],
])

describe('connectionOf', () => {
  test('live when the index is in and a relay answers', () => {
    expect(connectionOf(ready, [relay('live')], new Map())).toBe('live')
  })

  test('cached when figures come from storage and no relay answers', () => {
    expect(connectionOf(ready, [relay('failed')], cachedDoc)).toBe('cached')
  })

  test('offline when every relay failed or stayed silent', () => {
    expect(
      connectionOf({ status: 'loading' }, [relay('failed'), relay('silent')], new Map()),
    ).toBe('offline')
  })

  test('connecting otherwise', () => {
    expect(connectionOf({ status: 'loading' }, [relay('connecting')], new Map())).toBe(
      'connecting',
    )
  })
})

describe('stalenessOf (SPEC 3.4 step 8)', () => {
  const hour = 3_600_000
  test('fresh under 6 hours, a warning past 6, an alarm past 24', () => {
    expect(stalenessOf(0, 5 * hour)).toBe('fresh')
    expect(stalenessOf(0, 7 * hour)).toBe('warning')
    expect(stalenessOf(0, 25 * hour)).toBe('alarm')
  })
})

describe('the reader’s relays', () => {
  beforeEach(() => localStorage.clear())

  test('are the defaults until a reader chooses others', () => {
    expect(loadRelays()).toEqual(DEFAULT_RELAYS)
    expect(isCustom(loadRelays())).toBe(false)
  })

  test('are remembered, and forgotten on reset', () => {
    saveRelays(['wss://relay.example'])
    expect(loadRelays()).toEqual(['wss://relay.example'])
    expect(isCustom(loadRelays())).toBe(true)
    resetRelays()
    expect(loadRelays()).toEqual(DEFAULT_RELAYS)
  })

  test('ignore stored junk', () => {
    localStorage.setItem('golazo:relays', '{nope')
    expect(loadRelays()).toEqual(DEFAULT_RELAYS)
    localStorage.setItem('golazo:relays', JSON.stringify(['https://x', 5]))
    expect(loadRelays()).toEqual(DEFAULT_RELAYS)
  })

  test('accept only websocket URLs', () => {
    expect(isRelayUrl('wss://relay.mostro.network')).toBe(true)
    expect(isRelayUrl('ws://localhost:7777')).toBe(true)
    expect(isRelayUrl('https://relay.mostro.network')).toBe(false)
    expect(isRelayUrl('not a url')).toBe(false)
  })
})

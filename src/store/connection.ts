/**
 * What the header says about the connection and the age of the data (SPEC
 * 3.4 step 8, 6.1). Pure functions of the store's state and a clock.
 */
import { TIMEOUTS } from '~/config'
import type { RelayState } from '~/nostr/pool'
import type { BootState, DocState } from './store'

export type Connection = 'live' | 'cached' | 'offline' | 'connecting'

export function connectionOf(
  boot: BootState,
  relays: readonly RelayState[],
  documents: ReadonlyMap<string, DocState>,
): Connection {
  const anyLive = relays.some((relay) => relay.status === 'live')
  const anyCached = [...documents.values()].some((doc) => doc.status === 'cached')
  if (boot.status === 'ready' && anyLive) return 'live'
  if (anyCached) return 'cached'
  if (relays.every((r) => r.status === 'failed' || r.status === 'silent'))
    return 'offline'
  return 'connecting'
}

export type Staleness = 'fresh' | 'warning' | 'alarm'

/** Measured on the index's signed `created_at` (seconds) against the reader's clock. */
export function stalenessOf(createdAtSeconds: number, nowMs: number): Staleness {
  const age = nowMs - createdAtSeconds * 1000
  if (age > TIMEOUTS.stalenessAlarm) return 'alarm'
  return age > TIMEOUTS.stalenessWarning ? 'warning' : 'fresh'
}

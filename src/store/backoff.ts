/**
 * Reconnection delays, SPEC 3.4 step 7: exponential from 500 ms, capped at
 * 30 s, with jitter so a relay coming back is not met by every tab at once.
 */
import { BACKOFF } from '~/config'

export function backoffDelay(
  attempt: number,
  random: () => number = Math.random,
): number {
  const base = Math.min(BACKOFF.maxMs, BACKOFF.initialMs * 2 ** Math.max(0, attempt))
  const jitter = 1 + BACKOFF.jitterRatio * (random() * 2 - 1)
  return Math.round(Math.min(BACKOFF.maxMs, base * jitter))
}

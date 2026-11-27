/**
 * The reader's relay set (SPEC 7.3): the defaults, or a list they chose on the
 * trust page, kept in `localStorage`. A relay can withhold but never forge,
 * so this is the one setting a reader may change.
 */
import { DEFAULT_RELAYS } from '~/config'

const KEY = 'golazo:relays'

export function isRelayUrl(text: string): boolean {
  try {
    const url = new URL(text)
    return (url.protocol === 'wss:' || url.protocol === 'ws:') && url.hostname !== ''
  } catch {
    return false
  }
}

export function loadRelays(): readonly string[] {
  try {
    const raw = globalThis.localStorage?.getItem(KEY)
    const list: unknown = raw ? JSON.parse(raw) : null
    if (Array.isArray(list)) {
      const urls = list.filter((u): u is string => typeof u === 'string' && isRelayUrl(u))
      if (urls.length > 0) return urls
    }
  } catch {
    // Unreadable storage means the defaults.
  }
  return DEFAULT_RELAYS
}

export function saveRelays(urls: readonly string[]): void {
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(urls))
  } catch {
    // The choice lasts for this page only.
  }
}

export function resetRelays(): void {
  try {
    globalThis.localStorage?.removeItem(KEY)
  } catch {
    // Nothing stored, nothing to forget.
  }
}

export function isCustom(urls: readonly string[]): boolean {
  return urls.join(' ') !== DEFAULT_RELAYS.join(' ')
}

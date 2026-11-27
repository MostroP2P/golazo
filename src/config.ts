/**
 * Every value the site is configured with, in one file (SPEC 3.1, 3.4, 7.3).
 *
 * Nothing here is read at runtime from the page's host: the publisher key is
 * baked in at build time, so changing the trust anchor is a commit and a
 * deploy. Relay URLs are the exception the spec allows — a relay can withhold
 * an event but cannot forge one — and a reader may override the set locally.
 */

/** Publisher pubkey (hex), SPEC 3.1. The only place in the source naming one. */
export const PUBLISHER_PUBKEY: string =
  import.meta.env.VITE_PUBLISHER_PUBKEY ??
  '000001204177f1e40e2732aa6a01648fc545b73883f2b0ea6fbc91d3ea5a5b9f'

/** bestiario's addressable statistics events. */
export const BESTIARIO_KIND = 30666

/**
 * Where to read from: the daemon's two relays first, then the two bestiario-fe
 * keeps for redundancy. Adding a relay can only widen what this browser sees,
 * never change what it is willing to believe.
 */
export const DEFAULT_RELAYS: readonly string[] = [
  'wss://relay.mostro.network',
  'wss://nos.lol',
  'wss://mostro-p2p.tech',
  'wss://relay.shadowbip.com',
]

/** SPEC 3.4 step 8. All in milliseconds; staleness is measured on a signed `created_at`. */
export const TIMEOUTS = {
  index: 8_000,
  document: 8_000,
  stalenessWarning: 6 * 60 * 60 * 1000,
  stalenessAlarm: 24 * 60 * 60 * 1000,
} as const

/** SPEC 3.4 step 7. Exponential backoff with jitter, capped. */
export const BACKOFF = {
  initialMs: 500,
  maxMs: 30_000,
  jitterRatio: 0.3,
} as const

/**
 * BTC/USD sources, SPEC 5.4. Prices are not signed, so every figure built on
 * one names its source on screen.
 */
export const PRICE = {
  yadio: 'https://api.yadio.io/exrates/BTC',
  coingeckoSimple:
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
  coingeckoRange:
    'https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd',
  refreshMs: 5 * 60 * 1000,
  timeoutMs: 8_000,
} as const

/** The plan the tool follows. Linked from the footer. */
export const PLAN_URL = 'https://claude.ai/artifact/1BbThjULf11tmF1tDApGF4'

export const CACHE_SCHEMA_VERSION = 1

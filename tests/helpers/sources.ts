/**
 * Sources backed by the real fixtures, for model tests: every figure a board
 * test sees is one bestiario actually published.
 */
import { readFileSync, readdirSync } from 'node:fs'
import type { Envelope, Payload, SeriesPayload } from '~/nostr/documents'
import type { Source } from '~/model/source'

const DIR = 'tests/fixtures/snapshot'

export function fixturePayloads(): Map<string, Payload> {
  const payloads = new Map<string, Payload>()
  for (const file of readdirSync(DIR)) {
    if (file === 'manifest.json' || file === 'index.json') continue
    const event = JSON.parse(readFileSync(`${DIR}/${file}`, 'utf8')) as {
      tags: string[][]
      content: string
    }
    const d = event.tags.find((tag) => tag[0] === 'd')![1]!
    payloads.set(d, (JSON.parse(event.content) as Envelope).payload)
  }
  return payloads
}

/** A source per `d`: `ok` where a payload is given, `unavailable` otherwise. */
export function sourcesFrom(
  payloads: ReadonlyMap<string, Payload>,
  overrides: Record<string, Source> = {},
): (d: string) => Source {
  return (d) =>
    overrides[d] ??
    (payloads.has(d)
      ? { status: 'ok', d, payload: payloads.get(d)! }
      : { status: 'unavailable', d })
}

/** A monthly or daily series with only a `date` and a few named columns. */
export function series(
  columns: readonly string[],
  rows: readonly (readonly (string | number | null)[])[],
): SeriesPayload {
  return {
    period: { from: 'a', until: 'b' },
    resolution: 'monthly',
    columns: [
      { name: 'date', unit: 'date' },
      ...columns.map((name) => ({ name, unit: 'count' as const })),
    ],
    rows,
  }
}

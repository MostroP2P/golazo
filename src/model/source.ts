/**
 * Reading figures out of verified documents, with absence kept explicit.
 *
 * A figure is one of three things: a number bestiario published, a `null` it
 * published (absence, never zero), or something this browser could not read
 * because the document behind it is loading, missing or failed its proof. The
 * third carries the `d` and the reason so the panel can say which.
 */
import { isSeries, type Payload } from '~/nostr/documents'

export type Blocked = 'loading' | 'unavailable' | 'unverified'

export type Source =
  | {
      readonly status: 'ok'
      readonly d: string
      readonly payload: Payload
      /**
       * How far this document's figures reach, in ms: the coverage of the
       * newest index naming its payload. Absent when unknown.
       */
      readonly coverage?: number
    }
  | { readonly status: 'loading' | 'unavailable'; readonly d: string }
  | { readonly status: 'unverified'; readonly d: string; readonly reason: string }

export type Datum =
  | { readonly kind: 'value'; readonly value: number }
  | { readonly kind: 'absent' }
  | {
      readonly kind: 'blocked'
      readonly d: string
      readonly status: Blocked
      readonly reason?: string
    }

export const ABSENT: Datum = { kind: 'absent' }

export function blockedBy(source: Source): Datum {
  if (source.status === 'ok') return ABSENT
  return source.status === 'unverified'
    ? { kind: 'blocked', d: source.d, status: 'unverified', reason: source.reason }
    : { kind: 'blocked', d: source.d, status: source.status }
}

function asDatum(cell: unknown): Datum {
  return typeof cell === 'number' && Number.isFinite(cell)
    ? { kind: 'value', value: cell }
    : ABSENT
}

/** The cell of the row dated `date` in column `column`. The first column is `date`. */
export function seriesCell(source: Source, date: string, column: string): Datum {
  if (source.status !== 'ok') return blockedBy(source)
  const payload = source.payload
  if (!isSeries(payload)) return ABSENT
  const index = payload.columns.findIndex((c) => c.name === column)
  if (index < 0) return ABSENT
  const row = payload.rows.find((r) => r[0] === date)
  return row ? asDatum(row[index]) : ABSENT
}

/** A window document's metric, by name. */
export function metricValue(source: Source, name: string): Datum {
  if (source.status !== 'ok') return blockedBy(source)
  const payload = source.payload
  if (isSeries(payload)) return ABSENT
  const metric = payload.metrics.find((m) => m.name === name)
  return metric ? asDatum(metric.value) : ABSENT
}

/**
 * The instant a time-dependent figure from `source` is computed at: its own
 * coverage, never later than `now`. Each figure is tied to the document it
 * comes from, so a document retained from an older index neither stretches
 * its own totals over time it did not see nor shortens anyone else's.
 */
export function asOf(source: Source, now: number): number {
  return source.status === 'ok' && source.coverage !== undefined
    ? Math.min(source.coverage, now)
    : now
}

export function valueOf(datum: Datum): number | null {
  return datum.kind === 'value' ? datum.value : null
}

/**
 * Months, in UTC (SPEC 0): a month is `[YYYY-MM-01T00:00Z, first of next)`.
 * Every function here is pure and takes epoch milliseconds, never the
 * browser's clock: "now" is the archive's `coverage.last_event_at`.
 */
export const DAY_MS = 86_400_000

const MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/

export function isMonth(value: unknown): value is string {
  return typeof value === 'string' && MONTH.test(value)
}

function parts(month: string): [number, number] {
  const match = MONTH.exec(month)
  if (!match) throw new Error(`not a month: ${month}`)
  return [Number(match[1]), Number(match[2])]
}

function format(year: number, monthIndex: number): string {
  const date = new Date(Date.UTC(year, monthIndex, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

export function addMonths(month: string, count: number): string {
  const [year, m] = parts(month)
  return format(year, m - 1 + count)
}

/** First instant of the month, in ms. */
export function monthStart(month: string): number {
  const [year, m] = parts(month)
  return Date.UTC(year, m - 1, 1)
}

/** First instant of the following month, in ms. */
export function monthEnd(month: string): number {
  return monthStart(addMonths(month, 1))
}

/** 28 to 31. */
export function daysInMonth(month: string): number {
  return Math.round((monthEnd(month) - monthStart(month)) / DAY_MS)
}

/** The month an instant falls in. */
export function monthOf(ms: number): string {
  const date = new Date(ms)
  return format(date.getUTCFullYear(), date.getUTCMonth())
}

/** Every month from `from` to `until`, both included. Empty if reversed. */
export function monthRange(from: string, until: string): string[] {
  const months: string[] = []
  for (let month = from; month <= until; month = addMonths(month, 1)) {
    months.push(month)
  }
  return months
}

/** Days since the month began, with decimals (SPEC 5.2). */
export function daysElapsed(month: string, now: number): number {
  return (now - monthStart(month)) / DAY_MS
}

/** `YYYY-MM-DD` for each day of the month. */
export function daysOf(month: string): string[] {
  return Array.from(
    { length: daysInMonth(month) },
    (_, i) => `${month}-${String(i + 1).padStart(2, '0')}`,
  )
}

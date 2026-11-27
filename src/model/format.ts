/**
 * Number and date formats, SPEC 6.4: they follow the active locale — `es-AR`
 * (thousands point, decimal comma) in Spanish, `en-US` in English. Sats carry
 * no decimals, USD none on screen, percentages one. Rounding happens here and
 * only here, never in a calculation.
 *
 * Every formatter takes `null` and renders it as absence, never as zero.
 */
export type FormatLocale = 'en' | 'es'

export const ABSENT_TEXT = '—'

type Formats = {
  readonly integer: Intl.NumberFormat
  readonly oneDecimal: Intl.NumberFormat
  readonly twoDecimals: Intl.NumberFormat
  readonly months: readonly string[]
  /** `22,4 %` in Spanish, `22.4%` in English. */
  readonly percentSign: string
}

const MONTHS: Record<FormatLocale, readonly string[]> = {
  es: [
    'enero',
    'febrero',
    'marzo',
    'abril',
    'mayo',
    'junio',
    'julio',
    'agosto',
    'septiembre',
    'octubre',
    'noviembre',
    'diciembre',
  ],
  en: [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ],
}

function formatsFor(locale: FormatLocale): Formats {
  const tag = locale === 'es' ? 'es-AR' : 'en-US'
  const fixed = (digits: number) =>
    new Intl.NumberFormat(tag, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    })
  return {
    integer: new Intl.NumberFormat(tag, { maximumFractionDigits: 0 }),
    oneDecimal: fixed(1),
    twoDecimals: fixed(2),
    months: MONTHS[locale],
    percentSign: locale === 'es' ? ' %' : '%',
  }
}

let active: Formats = formatsFor('es')

/** Called once at startup, from the locale the reader's browser or choice picked. */
export function setFormatLocale(locale: FormatLocale): void {
  active = formatsFor(locale)
}

function present(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

/** `512.400` / `512,400` */
export function formatSats(value: number | null | undefined): string {
  return present(value) ? active.integer.format(Math.round(value)) : ABSENT_TEXT
}

/** USD with no decimals, as shown on screen. */
export function formatUsd(value: number | null | undefined): string {
  return present(value) ? active.integer.format(Math.round(value)) : ABSENT_TEXT
}

/** `315,03` / `315.03` — for the places that state an exact target. */
export function formatUsdExact(value: number | null | undefined): string {
  return present(value) ? active.twoDecimals.format(value) : ABSENT_TEXT
}

/** `54,6` / `54.6` */
export function formatDecimal(value: number | null | undefined): string {
  return present(value) ? active.oneDecimal.format(value) : ABSENT_TEXT
}

/** `22,4 %` / `22.4%` from a ratio. */
export function formatPercent(ratio: number | null | undefined): string {
  return present(ratio)
    ? `${active.oneDecimal.format(ratio * 100)}${active.percentSign}`
    : ABSENT_TEXT
}

/** A change, always signed: `+18,9 %`. */
export function formatChange(ratio: number | null | undefined): string {
  if (!present(ratio)) return ABSENT_TEXT
  const sign = ratio > 0 ? '+' : ratio < 0 ? '−' : ''
  return `${sign}${active.oneDecimal.format(Math.abs(ratio) * 100)}${active.percentSign}`
}

/** `1,32 M` / `1.32 M` */
export function formatMillions(value: number | null | undefined): string {
  return present(value)
    ? `${active.twoDecimals.format(value / 1_000_000)} M`
    : ABSENT_TEXT
}

/** Year and month name, or null for text that is not a `YYYY-MM`. */
function monthParts(month: string): { year: string; name: string } | null {
  const [year = '', m] = month.split('-')
  const name = active.months[Number(m) - 1]
  return name ? { year, name } : null
}

/** `noviembre 2026` / `November 2026` */
export function formatMonthLong(month: string): string {
  const parts = monthParts(month)
  return parts ? `${parts.name} ${parts.year}` : month
}

/** `nov 26` / `Nov 26` — a chart axis label. */
export function formatMonthShort(month: string): string {
  const parts = monthParts(month)
  return parts ? `${parts.name.slice(0, 3)} ${parts.year.slice(2)}` : month
}

/** `27 nov 18:37 UTC` / `27 Nov 18:37 UTC` */
export function formatInstant(ms: number): string {
  const date = new Date(ms)
  const month = active.months[date.getUTCMonth()]!.slice(0, 3)
  const hh = String(date.getUTCHours()).padStart(2, '0')
  const mm = String(date.getUTCMinutes()).padStart(2, '0')
  return `${date.getUTCDate()} ${month} ${hh}:${mm} UTC`
}

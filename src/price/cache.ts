/**
 * Closed months' prices, remembered: a closed month does not change (SPEC
 * 5.4). Advisory like the document cache — storage that throws costs a
 * request and changes no figure.
 */
const PREFIX = 'golazo:price:'

function storage(): Storage | null {
  try {
    return globalThis.localStorage
  } catch {
    return null
  }
}

export function readMonthPrice(month: string): number | null {
  try {
    const raw = storage()?.getItem(PREFIX + month)
    const value = raw ? Number(raw) : NaN
    return Number.isFinite(value) && value > 0 ? value : null
  } catch {
    return null
  }
}

export function writeMonthPrice(month: string, usd: number): void {
  try {
    storage()?.setItem(PREFIX + month, String(usd))
  } catch {
    // Over quota or refused: the price is on screen either way.
  }
}

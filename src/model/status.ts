/**
 * The traffic light, SPEC 5.3–5.5.
 *
 * A month's target is met in either unit. The sats target measures adoption;
 * the USD target is the same sats at the fixed reference price, and the real
 * fee is converted at the month's own price — so a BTC rally can carry a month
 * the sats alone did not. Comparisons are unrounded and `>=`: matching the
 * target is meeting it.
 */
export const SATS_PER_BTC = 100_000_000

export type Light = 'verde' | 'amarillo' | 'rojo' | 'sin-datos'

/** Sats at a USD/BTC price, unrounded. */
export function satsToUsd(sats: number, priceUsd: number): number {
  return (sats * priceUsd) / SATS_PER_BTC
}

export type Targets = {
  readonly metaSats: number
  readonly pisoSats: number
  readonly referencePriceUsd: number
}

/**
 * `value` is V (SPEC 5.2) or null when absent; `priceUsd` is P (SPEC 5.4).
 * Absence is never red.
 */
export function trafficLight(
  value: number | null,
  priceUsd: number,
  targets: Targets,
): Light {
  if (value === null) return 'sin-datos'
  const realUsd = satsToUsd(value, priceUsd)
  const metaUsd = satsToUsd(targets.metaSats, targets.referencePriceUsd)
  const pisoUsd = satsToUsd(targets.pisoSats, targets.referencePriceUsd)
  if (value >= targets.metaSats || realUsd >= metaUsd) return 'verde'
  if (value >= targets.pisoSats || realUsd >= pisoUsd) return 'amarillo'
  return 'rojo'
}

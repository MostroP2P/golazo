/**
 * Geometry of the pace chart (SPEC 6.1 item 6): the month's fee accumulated
 * day by day against the target and floor prorated over its days. Pure.
 */
import type { Pace } from '~/model/board'
import type { Frame } from './annual'
import { linear, linePath, niceTicks } from './scale'

export type PaceGeometry = {
  readonly realPath: string
  readonly metaPath: string
  readonly pisoPath: string
  readonly last: { x: number; y: number; value: number; day: number } | null
  readonly ticks: readonly { y: number; value: number }[]
  readonly dayTicks: readonly { x: number; day: number }[]
  readonly baseline: number
}

export function paceGeometry(
  pace: Pace,
  frame: Frame,
  fallbackTarget: number,
): PaceGeometry {
  const meta = pace.metaSats ?? fallbackTarget
  const values = pace.points.flatMap((p) => (p.cumulative === null ? [] : [p.cumulative]))
  const { top, ticks } = niceTicks(Math.max(meta, ...values))
  const x = linear([0, pace.days], [frame.left, frame.width - frame.right])
  const y = linear([0, top], [frame.height - frame.bottom, frame.top])
  const prorated = (total: number) => `M${x(0)},${y(0)}L${x(pace.days)},${y(total)}`
  const lastPoint = [...pace.points].reverse().find((p) => p.cumulative !== null)

  return {
    realPath: linePath([
      { x: x(0), y: y(0) },
      ...pace.points.map((p) => ({
        x: x(p.day),
        y: p.cumulative === null ? null : y(p.cumulative),
      })),
    ]),
    metaPath: prorated(meta),
    pisoPath: pace.pisoSats === null ? '' : prorated(pace.pisoSats),
    last:
      lastPoint && lastPoint.cumulative !== null
        ? {
            x: x(lastPoint.day),
            y: y(lastPoint.cumulative),
            value: lastPoint.cumulative,
            day: lastPoint.day,
          }
        : null,
    ticks: ticks.map((value) => ({ value, y: y(value) })),
    dayTicks: [1, 5, 10, 15, 20, 25, pace.days]
      .filter((d, i, all) => d <= pace.days && all.indexOf(d) === i)
      .map((day) => ({ day, x: x(day) })),
    baseline: y(0),
  }
}

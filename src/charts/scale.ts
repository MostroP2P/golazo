/** Linear scales and round ticks for the hand-written SVG charts. */
export type Scale = (value: number) => number

export function linear(
  domain: readonly [number, number],
  range: readonly [number, number],
): Scale {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0 || 1
  return (value) => r0 + ((value - d0) / span) * (r1 - r0)
}

/** A round upper bound and the ticks up to it, starting at zero. */
export function niceTicks(max: number, count = 4): { top: number; ticks: number[] } {
  if (!(max > 0)) return { top: 1, ticks: [0, 1] }
  const raw = max / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw)!
  const top = Math.ceil(max / step) * step
  const ticks = Array.from({ length: Math.round(top / step) + 1 }, (_, i) => i * step)
  return { top, ticks }
}

/** An SVG path through points, skipping gaps. */
export function linePath(points: readonly { x: number; y: number | null }[]): string {
  let path = ''
  let pen = false
  for (const { x, y } of points) {
    if (y === null) {
      pen = false
      continue
    }
    path += `${pen ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`
    pen = true
  }
  return path
}

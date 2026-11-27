/** The month in course, day by day, against the prorated target (SPEC 6.1 item 6). */
import { t } from '~/i18n'
import type { Board } from '~/model/board'
import type { Plan } from '~/plan/types'
import type { Frame } from '~/charts/annual'
import { paceGeometry } from '~/charts/pace'
import { formatMillions, formatMonthLong, formatSats } from '~/model/format'
import { Problem } from './Problem'

const FRAME: Frame = { width: 440, height: 320, top: 24, right: 14, bottom: 34, left: 54 }

export function PaceChart({
  board,
  plan,
}: {
  readonly board: Board
  readonly plan: Plan
}) {
  const pace = board.pace
  const g = paceGeometry(pace, FRAME, plan.base.devFeeSats)
  const targetLabel =
    pace.metaSats === null ? t.paceBase(formatSats(plan.base.devFeeSats)) : t.paceTarget
  return (
    <section class="glass card" aria-labelledby="pace-title">
      <h2 class="section-title" id="pace-title">
        {t.paceChart(formatMonthLong(pace.month))}
      </h2>
      <p class="section-desc" id="pace-desc">
        {t.paceChartDesc}
      </p>
      {pace.datum ? <Problem datum={pace.datum} /> : null}
      <svg
        class="chart"
        viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
        role="img"
        aria-labelledby="pace-title pace-desc"
      >
        <defs>
          <linearGradient id="pace-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stop-color="#8cc63f" stop-opacity="0.35" />
            <stop offset="1" stop-color="#8cc63f" stop-opacity="0" />
          </linearGradient>
        </defs>
        {g.ticks.map((tick) => (
          <g key={tick.value}>
            <line
              class="grid"
              x1={FRAME.left}
              x2={FRAME.width - FRAME.right}
              y1={tick.y}
              y2={tick.y}
            />
            <text x={FRAME.left - 8} y={tick.y + 4} text-anchor="end">
              {tick.value === 0 ? '0' : formatMillions(tick.value)}
            </text>
          </g>
        ))}
        {g.dayTicks.map((tick) => (
          <text key={tick.day} x={tick.x} y={g.baseline + 16} text-anchor="middle">
            {tick.day}
          </text>
        ))}
        <line
          class="axis"
          x1={FRAME.left}
          x2={FRAME.width - FRAME.right}
          y1={g.baseline}
          y2={g.baseline}
        />
        {g.pisoPath ? <path class="line-piso" d={g.pisoPath} /> : null}
        <path class="line-meta" d={g.metaPath} />
        {g.last ? (
          <path
            d={`${g.realPath}L${g.last.x},${g.baseline}L${FRAME.left},${g.baseline}Z`}
            fill="url(#pace-fill)"
          />
        ) : null}
        <path class="line-real" d={g.realPath} />
        {g.last ? (
          <g>
            <circle cx={g.last.x} cy={g.last.y} r="5" fill="#8cc63f">
              <title>{`${t.day(g.last.day)}: ${formatSats(g.last.value)} sats`}</title>
            </circle>
            <text
              class="marker-label"
              x={g.last.x - 8}
              y={g.last.y - 10}
              text-anchor="end"
            >
              {formatSats(g.last.value)}
            </text>
          </g>
        ) : null}
      </svg>
      <ul class="legend">
        <li>
          <span class="swatch swatch--real" aria-hidden="true" /> {t.paceReal}
        </li>
        <li>
          <span class="swatch swatch--meta" aria-hidden="true" /> {targetLabel}
        </li>
        {pace.pisoSats !== null ? (
          <li>
            <span class="swatch swatch--piso" aria-hidden="true" /> {t.paceFloor}
          </li>
        ) : null}
      </ul>
    </section>
  )
}

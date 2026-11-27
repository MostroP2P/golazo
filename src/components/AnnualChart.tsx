/** Dev fee per month against the target and floor (SPEC 6.1 item 5). Hand-written SVG. */
import { t } from '~/i18n'
import type { Board } from '~/model/board'
import type { Plan } from '~/plan/types'
import { annualGeometry, type Frame } from '~/charts/annual'
import { formatMillions, formatMonthShort, formatSats } from '~/model/format'

const FRAME: Frame = { width: 760, height: 330, top: 24, right: 12, bottom: 44, left: 54 }

export function AnnualChart({
  board,
  plan,
}: {
  readonly board: Board
  readonly plan: Plan
}) {
  const g = annualGeometry(board, plan, FRAME)
  const states = new Map(board.rows.map((row) => [row.month, row.state]))
  return (
    <section class="glass card" aria-labelledby="annual-title">
      <h2 class="section-title" id="annual-title">
        {t.annualChart}
      </h2>
      <p class="section-desc" id="annual-desc">
        {t.annualChartDesc}
      </p>
      <svg
        class="chart"
        viewBox={`0 0 ${FRAME.width} ${FRAME.height}`}
        role="img"
        aria-labelledby="annual-title annual-desc"
      >
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
        <line
          class="marker"
          x1={g.planX}
          x2={g.planX}
          y1={FRAME.top - 8}
          y2={g.baseline}
        />
        <text class="marker-label" x={g.planX + 6} y={FRAME.top - 10}>
          {t.planStarts}
        </text>
        {g.todayX !== null ? (
          <g>
            <line
              class="marker"
              x1={g.todayX}
              x2={g.todayX}
              y1={FRAME.top + 10}
              y2={g.baseline}
              opacity="0.5"
            />
            <text
              class="marker-label"
              x={g.todayX}
              y={FRAME.top + 4}
              text-anchor="middle"
            >
              {t.today}
            </text>
          </g>
        ) : null}
        {g.bars.map((bar) => (
          <g key={bar.month} class="bar-group">
            <title>
              {`${formatMonthShort(bar.month)}: ${formatSats(bar.real)} sats` +
                (bar.projection !== null
                  ? ` · ${t.proj} ${formatSats(bar.projection)}`
                  : '')}
            </title>
            {bar.projection !== null && bar.projectionHeight > 0 ? (
              <rect
                class="bar-proj"
                x={bar.x}
                y={bar.projectionY}
                width={bar.width}
                height={bar.projectionHeight}
                rx="3"
              />
            ) : null}
            {bar.real !== null ? (
              <rect
                class={`bar-real${states.get(bar.month) === 'previo' ? ' bar-real--previo' : ''}`}
                x={bar.x}
                y={bar.realY}
                width={bar.width}
                height={Math.max(0, bar.realHeight)}
                rx="3"
              />
            ) : null}
            <text x={bar.center} y={g.baseline + 16} text-anchor="middle">
              {formatMonthShort(bar.month).slice(0, 3)}
            </text>
            {bar.month.endsWith('-01') || bar.month === g.bars[0]?.month ? (
              <text x={bar.center} y={g.baseline + 29} text-anchor="middle">
                {bar.month.slice(0, 4)}
              </text>
            ) : null}
          </g>
        ))}
        <line
          class="axis"
          x1={FRAME.left}
          x2={FRAME.width - FRAME.right}
          y1={g.baseline}
          y2={g.baseline}
        />
        <path class="line-piso" d={g.pisoPath} />
        <path class="line-meta" d={g.metaPath} />
        {g.piso.map((p) => (
          <circle
            key={`p${p.month}`}
            class="dot-piso"
            cx={p.x}
            cy={p.y}
            r={p.quarter ? 4 : 2.5}
          >
            <title>{`${t.floor} ${formatMonthShort(p.month)}: ${formatSats(p.value)} sats`}</title>
          </circle>
        ))}
        {g.meta.map((p) => (
          <circle
            key={`m${p.month}`}
            class="dot-meta"
            cx={p.x}
            cy={p.y}
            r={p.quarter ? 6 : 3.5}
          >
            <title>{`${t.target} ${p.month === 'base' ? 'base' : formatMonthShort(p.month)}: ${formatSats(p.value)} sats`}</title>
          </circle>
        ))}
      </svg>
      <ul class="legend">
        <li>
          <span class="swatch swatch--real" aria-hidden="true" /> {t.real}
        </li>
        <li>
          <span class="swatch swatch--proj" aria-hidden="true" /> {t.projectedLegend}
        </li>
        <li>
          <span class="swatch swatch--meta" aria-hidden="true" /> {t.target}
        </li>
        <li>
          <span class="swatch swatch--piso" aria-hidden="true" /> {t.floor}
        </li>
      </ul>
    </section>
  )
}

/** The month on the card: light, accumulated, projection, targets, progress (SPEC 6.1 item 2). */
import { t } from '~/i18n'
import type { Board } from '~/model/board'
import type { Plan } from '~/plan/types'
import { daysInMonth } from '~/model/calendar'
import {
  formatChange,
  formatDecimal,
  formatMonthLong,
  formatPercent,
  formatSats,
  formatUsd,
} from '~/model/format'
import { judged } from '~/model/months'
import { satsToUsd } from '~/model/status'
import { valueOf } from '~/model/source'
import { isFallback } from '~/price/choose'
import { finalTarget } from '~/model/indicators'
import { LightBadge } from './LightBadge'
import { Goal } from './Goal'
import { Problem } from './Problem'
import { priceLabel } from './price'
import type { Staleness } from '~/store/connection'

type Props = {
  readonly board: Board
  readonly plan: Plan
  readonly staleness: Staleness
  readonly ageHours: number
}

function title(board: Board): string {
  const month = formatMonthLong(board.current.month)
  if (board.stage === 'before') return t.beforePlan(month)
  if (board.stage === 'after') return `${t.afterPlan} · ${month}`
  return t.planMonth(board.n, month)
}

export function MonthCard({ board, plan, staleness, ageHours }: Props) {
  const row = board.current
  const evaluation = row.evaluation
  const real = valueOf(row.real)
  const value = judged(evaluation)
  const ref = plan.referencePriceUsd
  const first = plan.months[0]!
  const final = finalTarget(plan)
  const floor = plan.months[plan.months.length - 1]!.pisoSats
  const days = 'days' in evaluation ? evaluation.days : daysInMonth(row.month)
  const projected = evaluation.kind === 'projected'

  return (
    <section class="glass card month-card" aria-labelledby="month-title">
      <div class="month-card__head">
        <div>
          <p class="eyebrow">
            {row.phase === 'closed' ? t.eyebrowResult : t.eyebrowLive}
          </p>
          <h1 class="month-card__title" id="month-title">
            {title(board)}
          </h1>
        </div>
        <LightBadge
          light={row.light}
          projected={projected}
          insufficient={evaluation.kind === 'insufficient' && row.target !== null}
          size="lg"
        />
      </div>

      <Problem datum={row.real} />

      <div class="score">
        <div class="score__cell">
          <p class="score__label">
            {row.phase === 'closed' ? t.real : t.accumulatedLabel}
          </p>
          <p class="score__value">
            {formatSats(real)}
            <span class="score__unit">sats</span>
          </p>
          <p class="score__sub">
            {row.phase === 'closed'
              ? t.closedWith(formatSats(real))
              : t.accumulatedIn(
                  formatSats(real),
                  formatDecimal(days),
                  daysInMonth(row.month),
                )}
          </p>
        </div>
        <div class="score__cell">
          <p class="score__label">{projected ? t.projection : t.real}</p>
          <p class="score__value score__value--accent">
            {formatSats(value)}
            <span class="score__unit">sats</span>
          </p>
          <p class="score__sub">
            {row.realUsd !== null ? `≈ ${formatUsd(row.realUsd)} USD ` : ''}
            {priceLabel(row.price)}
          </p>
        </div>
      </div>

      <ul class="targets">
        {row.target ? (
          <>
            <li>
              {t.target}:{' '}
              <strong class="num">{formatSats(row.target.metaSats)} sats</strong>{' '}
              {t.orUsd(formatUsd(row.metaUsd))}
            </li>
            <li>
              {t.floor}:{' '}
              <strong class="num">{formatSats(row.target.pisoSats)} sats</strong>{' '}
              {t.orUsd(formatUsd(row.pisoUsd))}
            </li>
            {row.shareOfMeta !== null ? (
              <li>
                <strong class="num">{formatPercent(row.shareOfMeta)}</strong> {t.ofTarget}
              </li>
            ) : null}
          </>
        ) : (
          <>
            <li>
              {t.vsBase(
                formatChange(value === null ? null : value / plan.base.devFeeSats - 1),
                formatSats(plan.base.devFeeSats),
              )}
            </li>
            <li>
              {t.firstTarget(
                formatSats(first.metaSats),
                formatUsd(satsToUsd(first.metaSats, ref)),
              )}
            </li>
          </>
        )}
      </ul>

      <Goal
        value={value}
        floor={floor}
        target={final}
        finalUsd={formatUsd(satsToUsd(final, ref))}
      />

      <div class="notices">
        {staleness === 'alarm' ? (
          <p class="notice notice--alarm">{t.staleAlarm(ageHours)}</p>
        ) : null}
        {isFallback(row.price) ? (
          <p class="notice notice--warn">{t.priceFallback}</p>
        ) : null}
        {row.partialCoverage ? (
          <p class="notice notice--warn">
            {t.partialCoverage(formatPercent(row.coverage))}
          </p>
        ) : null}
        {row.restated ? (
          <p class="notice notice--info">{t.restated(row.restated)}</p>
        ) : null}
        {row.derivedFromDaily ? (
          <p class="notice notice--info">{t.derivedDaily}</p>
        ) : null}
      </div>
    </section>
  )
}

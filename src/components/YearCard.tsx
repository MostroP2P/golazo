/** The year at a glance: SPEC 5.8, and the review banner when it applies. */
import { t } from '~/i18n'
import type { Board } from '~/model/board'
import { REQUIRED_GROWTH } from '~/model/indicators'
import {
  formatChange,
  formatMillions,
  formatMonthShort,
  formatSats,
} from '~/model/format'

export function YearCard({ board }: { readonly board: Board }) {
  const year = board.year
  const acc = year.accumulated
  const growthOk = year.growth === null ? null : year.growth >= REQUIRED_GROWTH
  return (
    <section class="glass card" aria-labelledby="year-title">
      <p class="eyebrow">{t.year}</p>
      <h2 class="section-title" id="year-title">
        {t.planName}
      </h2>
      <dl class="facts">
        <div class="fact">
          <dt>{t.closedLabel}</dt>
          <dd>
            {t.closedOnTarget(year.closedOnTarget.green, year.closedOnTarget.total)}
          </dd>
        </div>
        <div class="fact">
          <dt>{t.growthVs(formatMonthShort(year.previousMonth))}</dt>
          <dd class={growthOk === null ? '' : growthOk ? 'good' : 'bad'}>
            {formatChange(year.growth)}
            <span class="fact__note">
              {t.growthNeeded(formatChange(REQUIRED_GROWTH))}
            </span>
          </dd>
        </div>
        {year.requiredRate !== null ? (
          <div class="fact">
            <dt>{t.requiredRate}</dt>
            <dd>
              {formatChange(year.requiredRate)}
              <span class="fact__note">{t.perMonth}</span>
            </dd>
          </div>
        ) : null}
        <div class="fact">
          <dt>{t.accumulated}</dt>
          {board.stage === 'before' ? (
            <dd>
              {formatMillions(0)}
              <span class="fact__note">{t.planStartsOn}</span>
              <span class="fact__note">
                {t.accumulatedAnnual(formatSats(acc.annual))}
              </span>
            </dd>
          ) : (
            <dd>
              {t.accumulatedOf(formatMillions(acc.actual), formatMillions(acc.target))}
              <span class="fact__note">
                {t.accumulatedAnnual(formatSats(acc.annual))}
              </span>
            </dd>
          )}
        </div>
      </dl>
      {acc.missing.length > 0 ? (
        <p class="notice notice--info small">
          {t.accumulatedMissing(acc.missing.map(formatMonthShort).join(', '))}
        </p>
      ) : null}
    </section>
  )
}

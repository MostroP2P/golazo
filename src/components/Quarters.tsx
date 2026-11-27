/** Quarter closes, months 3, 6, 9 and 12 (SPEC 6.1 item 8). */
import { t } from '~/i18n'
import type { Board } from '~/model/board'
import { formatMonthLong } from '~/model/format'
import { LightBadge } from './LightBadge'

export function Quarters({ board }: { readonly board: Board }) {
  return (
    <section class="glass card" aria-labelledby="quarters-title">
      <h2 class="section-title" id="quarters-title" style={{ marginBottom: '16px' }}>
        {t.quarters}
      </h2>
      <ul class="quarters">
        {board.year.quarters.map((q) => (
          <li key={q.quarter} class="quarter">
            <span class="quarter__q">{q.quarter}</span>
            <div>
              <span class="quarter__month">{formatMonthLong(q.month)}</span>
              {q.light && q.month <= board.current.month ? (
                <LightBadge light={q.light} projected={!q.closed} size="sm" />
              ) : (
                <span class="muted small">{t.quarterPending}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

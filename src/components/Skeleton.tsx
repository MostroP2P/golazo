/** Placeholders the size of the final blocks, under one accessible message. */
import { t } from '~/i18n'

export function BoardSkeleton() {
  return (
    <div class="stack" aria-busy="true">
      <p class="visually-hidden" role="status">
        {t.loading}
      </p>
      <div class="hero" aria-hidden="true">
        <div class="skeleton" style={{ height: '420px' }} />
        <div class="skeleton" style={{ height: '420px' }} />
      </div>
      <div class="levers" aria-hidden="true">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} class="skeleton" style={{ height: '150px' }} />
        ))}
      </div>
      <div class="skeleton" style={{ height: '380px' }} aria-hidden="true" />
    </div>
  )
}

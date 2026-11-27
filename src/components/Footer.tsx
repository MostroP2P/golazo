import { t } from '~/i18n'
import { PLAN_URL } from '~/config'

export function Footer() {
  return (
    <footer class="foot">
      <div class="container foot__row">
        <p>{t.footerProof}</p>
        <nav aria-label={t.footerSource}>
          <a href={PLAN_URL} rel="noopener noreferrer" target="_blank">
            {t.footerPlan}
          </a>
          <a
            href="https://github.com/MostroP2P/golazo"
            rel="noopener noreferrer"
            target="_blank"
          >
            {t.footerSource}
          </a>
          <a href="https://mostro.network" rel="noopener noreferrer" target="_blank">
            mostro.network
          </a>
        </nav>
      </div>
    </footer>
  )
}

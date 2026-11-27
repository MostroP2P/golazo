/** Name, connection state, data time, staleness, refresh and the trust link (SPEC 6.1 item 1). */
import { t } from '~/i18n'
import { formatInstant } from '~/model/format'
import type { Connection } from '~/store/connection'
import logo from '~/assets/mostro-icon-green.svg'
import { RefreshIcon } from './Icons'
import { LanguagePicker } from './LanguagePicker'

type Props = {
  readonly connection: Connection
  readonly now: number | null
  readonly route: 'tablero' | 'confianza'
  readonly onRefresh: () => void
}

export function Header({ connection, now, route, onRefresh }: Props) {
  return (
    <header class="top">
      <div class="container top__bar">
        <a class="brand" href="#/" aria-label={`${t.appName} · ${t.planName}`}>
          <img class="brand__logo" src={logo} alt="" width="30" height="42" />
          <span class="brand__name">{t.appName}</span>
          <span class="brand__plan">{t.planName}</span>
        </a>
        <p class={`live live--${connection}`} role="status" style={{ margin: 0 }}>
          <span class="live__dot" aria-hidden="true" />
          <span class="live__label">{t.connection[connection]}</span>
          {now !== null ? (
            <span class="live__when">· {t.dataAt(formatInstant(now))}</span>
          ) : null}
        </p>
        <button type="button" class="icon-btn" onClick={onRefresh} title={t.refresh}>
          <RefreshIcon />
          <span class="visually-hidden">{t.refresh}</span>
        </button>
        <LanguagePicker onChange={() => location.reload()} />
        <nav aria-label={t.trustLink}>
          {route === 'tablero' ? (
            <a class="nav-link" href="#/confianza">
              {t.trustLink}
            </a>
          ) : (
            <a class="nav-link" href="#/">
              {t.boardLink}
            </a>
          )}
        </nav>
      </div>
    </header>
  )
}

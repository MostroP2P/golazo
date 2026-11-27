/** The trust page (SPEC 6.2): who signs, which relays, which documents and how they fared. */
import { useState } from 'preact/hooks'
import { nip19 } from 'nostr-tools'
import { t } from '~/i18n'
import { PUBLISHER_PUBKEY } from '~/config'
import { formatInstant } from '~/model/format'
import type { AppView } from '~/store/useBoard'
import type { DocState } from '~/store/store'
import { isCustom, isRelayUrl, loadRelays, resetRelays, saveRelays } from '~/store/relays'
import { failureText } from '~/components/Problem'

function docStatus(state: DocState | undefined): string {
  if (!state) return t.trust.docStatus.loading
  const label = t.trust.docStatus[state.status]
  return state.status === 'unverified' ? `${label} (${failureText(state.reason)})` : label
}

function Relays({ app, onChange }: { readonly app: AppView; onChange: () => void }) {
  const [draft, setDraft] = useState('')
  const [error, setError] = useState(false)
  const urls = loadRelays()
  const states = new Map(app.relays.map((r) => [r.url, r]))
  const save = (next: readonly string[]) => {
    saveRelays(next)
    onChange()
  }
  return (
    <section class="glass card" aria-labelledby="relays-title">
      <h2 class="section-title" id="relays-title" style={{ marginBottom: '14px' }}>
        {t.trust.relays}
      </h2>
      <ul class="relay-list">
        {urls.map((url) => {
          const state = states.get(url)
          return (
            <li key={url} class="relay">
              <span class="relay__url">{url}</span>
              <span class="small muted">
                {state ? t.trust.relayStatus[state.status] : '—'}
                {state?.newestAt
                  ? ` · ${t.trust.newest} ${formatInstant(state.newestAt * 1000)}`
                  : ''}
              </span>
              {urls.length > 1 ? (
                <button
                  type="button"
                  class="icon-btn"
                  aria-label={t.trust.remove(url)}
                  onClick={() => save(urls.filter((u) => u !== url))}
                >
                  ×
                </button>
              ) : null}
            </li>
          )
        })}
      </ul>
      <form
        class="relay-form"
        onSubmit={(event) => {
          event.preventDefault()
          const url = draft.trim()
          if (!isRelayUrl(url)) {
            setError(true)
            return
          }
          setError(false)
          setDraft('')
          if (!urls.includes(url)) save([...urls, url])
        }}
      >
        <label class="visually-hidden" for="relay-input">
          {t.trust.addRelay}
        </label>
        <input
          id="relay-input"
          value={draft}
          placeholder="wss://"
          aria-invalid={error}
          aria-describedby={error ? 'relay-error' : undefined}
          onInput={(event) => setDraft((event.target as HTMLInputElement).value)}
        />
        <button type="submit" class="btn">
          {t.trust.add}
        </button>
        {isCustom(urls) ? (
          <button
            type="button"
            class="btn"
            onClick={() => {
              resetRelays()
              onChange()
            }}
          >
            {t.trust.resetRelays}
          </button>
        ) : null}
      </form>
      {error ? (
        <p
          id="relay-error"
          class="notice notice--warn small"
          style={{ marginTop: '10px' }}
        >
          {t.trust.badRelay}
        </p>
      ) : null}
      {isCustom(urls) ? <p class="muted small">{t.trust.customNote}</p> : null}
    </section>
  )
}

export function Confianza({
  app,
  onRelaysChange,
}: {
  readonly app: AppView
  onRelaysChange: () => void
}) {
  const boot = app.boot
  const entries = new Map(
    boot.status === 'ready' ? boot.index.documents.map((e) => [e.d, e]) : [],
  )
  return (
    <div class="stack">
      <section class="glass card" aria-labelledby="trust-title">
        <p class="eyebrow">nostr · kind 30666</p>
        <h1 class="month-card__title" id="trust-title">
          {t.trust.title}
        </h1>
        <p class="section-desc" style={{ marginTop: '8px' }}>
          {t.trust.intro}
        </p>
        <dl class="kv">
          <dt>{t.trust.publisher}</dt>
          <dd class="mono-break">{nip19.npubEncode(PUBLISHER_PUBKEY)}</dd>
          <dt>{t.trust.index}</dt>
          <dd>
            {boot.status === 'ready'
              ? `${t.trust.snapshot} ${boot.index.snapshot_id} · ${t.trust.signedAt} ${formatInstant(boot.createdAt * 1000)}`
              : boot.status === 'failed'
                ? failureText(boot.reason)
                : t.trust.docStatus.loading}
          </dd>
          {boot.status === 'ready' ? (
            <>
              <dt>{t.trust.coverage}</dt>
              <dd>{formatInstant(Date.parse(boot.index.coverage.last_event_at))}</dd>
            </>
          ) : null}
        </dl>
      </section>
      <div class="trust-grid">
        <Relays app={app} onChange={onRelaysChange} />
        <section class="glass card" aria-labelledby="restated-title">
          <h2 class="section-title" id="restated-title">
            {t.trust.restatedTitle}
          </h2>
          {app.restated.size === 0 ? (
            <p class="muted small">—</p>
          ) : (
            <ul class="small">
              {[...app.restated].map(([d, r]) => (
                <li key={d}>
                  <span class="num">{d}</span>: {r.fromRevision} → {r.toRevision} (
                  {r.because})
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <section class="glass card doc-table" aria-labelledby="docs-title">
        <h2 class="section-title" id="docs-title" style={{ marginBottom: '12px' }}>
          {t.trust.documents}
        </h2>
        <div class="table-wrap" tabIndex={0} role="region" aria-labelledby="docs-title">
          <table>
            <thead>
              <tr>
                {t.trust.docColumns.map((c) => (
                  <th key={c} scope="col">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {['index', ...app.needed].map((d) => {
                const state = app.documents.get(d)
                const live =
                  state?.status === 'live' || state?.status === 'cached' ? state : null
                const entry = entries.get(d)
                return (
                  <tr key={d}>
                    <th scope="row" class="num">
                      {d}
                    </th>
                    <td>
                      {d === 'index'
                        ? t.trust.docStatus[boot.status === 'ready' ? 'live' : 'loading']
                        : docStatus(state)}
                    </td>
                    <td class="num">
                      {live?.envelope.revision ?? entry?.revision ?? '—'}
                    </td>
                    <td class="mono-break">{entry?.hash ?? '—'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

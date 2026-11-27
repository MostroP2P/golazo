/** Why a block shows no figure: never a number, always a reason (SPEC 6.3). */
import { t } from '~/i18n'
import type { Datum } from '~/model/source'

export function failureText(reason: string | undefined): string {
  return (reason && t.failure[reason]) ?? reason ?? ''
}

/** A one-line message for a blocked figure, or null when the figure is readable. */
export function problemText(datum: Datum): string | null {
  if (datum.kind !== 'blocked' || datum.status === 'loading') return null
  return datum.status === 'unverified'
    ? t.unverified(failureText(datum.reason))
    : t.unavailable(datum.d)
}

export function Problem({ datum }: { readonly datum: Datum }) {
  const text = problemText(datum)
  if (!text) return null
  const unverified = datum.kind === 'blocked' && datum.status === 'unverified'
  return <p class={`problem${unverified ? ' problem--unverified' : ''}`}>{text}</p>
}

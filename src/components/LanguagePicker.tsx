/** EN / ES. A change is stored and the page reloads in the chosen language. */
import { t, locale } from '~/i18n'
import { LOCALES, storeLocale, type Locale } from '~/i18n/locale'

export function LanguagePicker({ onChange }: { readonly onChange: () => void }) {
  return (
    <label class="lang">
      <span class="visually-hidden">{t.language}</span>
      <select
        value={locale}
        onChange={(event) => {
          storeLocale((event.target as HTMLSelectElement).value as Locale)
          onChange()
        }}
      >
        {LOCALES.map((code) => (
          <option key={code} value={code}>
            {code.toUpperCase()}
          </option>
        ))}
      </select>
    </label>
  )
}

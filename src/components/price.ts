/** How a price is named next to a USD figure (SPEC 5.4: always say which). */
import { t } from '~/i18n'
import { formatUsd } from '~/model/format'
import type { PriceQuote } from '~/price/choose'

export function priceLabel(quote: PriceQuote | null): string | null {
  if (!quote) return null
  return t.priceUsed(formatUsd(quote.usd), t.priceSource[quote.source] ?? quote.source)
}

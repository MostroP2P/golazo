/**
 * Two hash routes (SPEC 6): `#/` and `#/confianza`. Hash routing because
 * GitHub Pages serves no rewrites. An unknown hash opens the board.
 */
import { useEffect, useState } from 'preact/hooks'

export type Route = 'tablero' | 'confianza'

export function routeOf(hash: string): Route {
  return hash.replace(/^#\/?/, '').replace(/\/+$/, '').toLowerCase() === 'confianza'
    ? 'confianza'
    : 'tablero'
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => routeOf(location.hash))
  useEffect(() => {
    const onChange = () => {
      setRoute(routeOf(location.hash))
      window.scrollTo({ top: 0 })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}

// The suite asserts on the Spanish catalogue; the locale is read once, at import.
localStorage.setItem('golazo:locale', 'es')

import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/preact'

// Testing Library cleans up by itself only with vitest globals, which are off.
afterEach(() => cleanup())

// jsdom does not implement scrolling; the router scrolls to the top on a route change.
window.scrollTo = () => {}

/** The shell: sky, header, the route, footer. */
import { useRoute } from './router'
import { useBoard } from './store/useBoard'
import { connectionOf } from './store/connection'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { Tablero } from './views/Tablero'
import { Confianza } from './views/Confianza'

function Shell() {
  const route = useRoute()
  const app = useBoard()
  return (
    <div class="page">
      <Header
        connection={connectionOf(app.boot, app.relays, app.documents)}
        now={app.now}
        route={route}
        onRefresh={app.refresh}
      />
      <main id="main">
        <div class="container">
          {route === 'confianza' ? (
            // A changed relay list takes effect on a fresh page and a fresh pool.
            <Confianza app={app} onRelaysChange={() => location.reload()} />
          ) : (
            <Tablero app={app} />
          )}
        </div>
      </main>
      <Footer />
    </div>
  )
}

export function App() {
  return (
    <>
      <div class="sky" aria-hidden="true" />
      <Shell />
    </>
  )
}

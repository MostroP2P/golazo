/**
 * Regenerates tests/fixtures/snapshot/ from the live relays.
 *
 * The fixtures are the real signed events, byte for byte as they travel: the
 * index, every document Golazo reads (SPEC 4), and a few window documents
 * that exercise the parts of `canonical.ts` Golazo's own documents do not (a
 * fiat metric, an inferred metric with its error). Everything in tests/nostr
 * and the hermetic end-to-end run is checked against these.
 *
 * Only the documents Golazo reads are captured, not the whole archive: relays
 * keep stale revisions of old partitions the publisher no longer refreshes on
 * them, and a fixture that does not match its index proves nothing.
 *
 * Run: node scripts/fetch-fixtures.mjs
 *
 * A regeneration is a commit a human reads.
 */
import { SimplePool } from 'nostr-tools/pool'
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'

const OUT = 'tests/fixtures/snapshot'

// Not imported from src/config.ts: that module is Vite's, not Node's. The
// manifest records what this run used, and a test asserts it still matches.
const PUBLISHER_PUBKEY =
  process.env.PUBLISHER ??
  '000001204177f1e40e2732aa6a01648fc545b73883f2b0ea6fbc91d3ea5a5b9f'
const BESTIARIO_KIND = 30666
const relays = [
  'wss://relay.mostro.network',
  'wss://nos.lol',
  'wss://mostro-p2p.tech',
  'wss://relay.shadowbip.com',
]

/** Months from `from` to `until`, both `YYYY-MM`, both included. */
function monthRange(from, until) {
  const out = []
  let [year, month] = from.split('-').map(Number)
  for (;;) {
    const text = `${year}-${String(month).padStart(2, '0')}`
    if (text > until) return out
    out.push(text)
    month += 1
    if (month > 12) {
      month = 1
      year += 1
    }
  }
}

/** Mirrors `neededDocuments` in src/model/months.ts for the plan's span. */
function wanted(nowMonth) {
  const until = nowMonth < '2027-11' ? nowMonth : '2027-11'
  const yearly = ['dev-fees', 'orders', 'volume'].flatMap((report) =>
    ['2026', '2027'].map((year) => `series:${report}:monthly:${year}`),
  )
  const daily = monthRange('2026-09', until).flatMap((month) => [
    `series:dev-fees:daily:${month}`,
    `series:orders:daily:${month}`,
  ])
  const extra = ['volume:30d', 'dev-fees:30d', `series:volume:daily:${until}`]
  return [...yearly, ...daily, 'summary:30d', ...extra]
}

const pool = new SimplePool()

/** Newest per `d`: a relay serving a stale replaceable event is normal. */
function newestPerD(events) {
  const newest = new Map()
  for (const event of events) {
    const d = event.tags.find((tag) => tag[0] === 'd')?.[1]
    if (!d) continue
    const held = newest.get(d)
    if (!held || event.created_at > held.created_at) newest.set(d, event)
  }
  return newest
}

const indexEvents = await pool.querySync(
  relays,
  { kinds: [BESTIARIO_KIND], authors: [PUBLISHER_PUBKEY], '#d': ['index'] },
  { maxWait: 15_000 },
)
const index = newestPerD(indexEvents).get('index')
if (!index) {
  pool.close(relays)
  console.error('the publisher has no index: is the pubkey right, and are the relays up?')
  process.exit(1)
}
const indexDoc = JSON.parse(index.content)
const named = new Set(indexDoc.documents.map((entry) => entry.d))
const ds = wanted(indexDoc.coverage.last_event_at.slice(0, 7)).filter((d) => named.has(d))

const events = await pool.querySync(
  relays,
  { kinds: [BESTIARIO_KIND], authors: [PUBLISHER_PUBKEY], '#d': ds },
  { maxWait: 20_000 },
)
pool.close(relays)

const newest = newestPerD(events)
newest.set('index', index)

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

/** The file for `d` is `d` with every `:` replaced by `-`, plus `.json`. */
const fileFor = (d) => `${d.replaceAll(':', '-')}.json`

for (const [d, event] of newest) {
  writeFileSync(`${OUT}/${fileFor(d)}`, JSON.stringify(event, null, 2) + '\n')
}

const manifest = {
  fetched_at: new Date().toISOString(),
  publisher: PUBLISHER_PUBKEY,
  relays,
  snapshot_id: indexDoc.snapshot_id,
  documents: [...newest.keys()].sort(),
  missing: ds.filter((d) => !newest.has(d)),
}
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest, null, 2) + '\n')

console.error(`wrote ${newest.size} events to ${OUT} (snapshot ${manifest.snapshot_id})`)
if (manifest.missing.length > 0) console.error(`missing: ${manifest.missing.join(', ')}`)

# AGENTS.md

Instructions for coding agents (Claude Code, Codex, Cursor, Aider and similar)
working in this repository. Humans are welcome to read it too — nothing here
is addressed only to a machine.

Read [`docs/SPEC.md`](docs/SPEC.md) before changing anything. It is the source
of truth for what Golazo measures, every formula and colour rule (§5 is
normative), the data it reads and the tests that prove it. `README.md` is the
shorter way in.

## Everything written here is in English

Source code, identifiers, comments, documentation, test names, fixtures,
commit messages, branch names, issue titles and bodies, pull request titles
and bodies, review comments, and replies to review comments — including
replies to automated reviewers. All of it, always, in English.

Conversation with the maintainer may happen in Spanish. The artifacts do not:
a comment on a pull request is an artifact, and so is a reply to a reviewer.
Mostro is worked on across several languages, and a thread nobody outside one
of them can follow is a decision taken in private in a public place.

If you are prompted in another language, answer the person in that language,
but write English into the repository, the issue tracker and the pull request.
If another language is already there, fix it.

The one exception is the translation catalogues under `src/i18n/`, which are
by definition not all in English: `en.ts` is the source catalogue and `es.ts`
is its translation. Their *keys*, the `Strings` type in `strings.ts`, and
every comment around them stay English.

## What this project is

Golazo is the progress board of the Mostro 2027 plan: it shows, live and with
no server, whether the network is on its way to multiplying the monthly dev
fee by ten. It is a static site that reads the signed statistics
[bestiario](https://github.com/MostroP2P/bestiario) publishes on Nostr
(kind `30666`), verifies them in the browser exactly the way
[bestiario-fe](https://github.com/MostroP2P/bestiario-fe) does, and compares
them with the monthly targets in `config/plan-2027.json`.

Two properties everything else serves, and neither is negotiable in a patch:

**A reader trusts one pubkey, not a host.** Every figure on screen came from
an event whose author, Schnorr signature and payload hash were checked in the
browser that drew it. The publisher key is baked in at build time
(`VITE_PUBLISHER_PUBKEY`); nothing may read a trust anchor from the page's
host, a query string, a relay or a file next to the page.

**The site never invents a number.** `null` is absence and renders as
absence, never as zero. A month with no data is "no data", never red. A
document no relay delivered says so; one that failed its proof says which
check failed and shows no figure at all.

BTC prices (Yadio, CoinGecko) are the only unsigned input. Every USD figure
built on one names its source on screen.

## Repository layout

| Path | Purpose |
| --- | --- |
| `docs/SPEC.md` | The specification. Change it first when behaviour changes |
| `config/plan-2027.json` | The plan's targets. Edited by pull request, validated at start-up |
| `src/config.ts` | Publisher key, relays, timeouts, price URLs: every setting, in one place |
| `src/nostr/` | `address`, `canonical`, `verify`, `hash`, `pool`, `documents`, from bestiario-fe |
| `src/store/` | The client algorithm of SPEC §3.4: index, documents, cache, relays, reconnection |
| `src/plan/` | Loading and validating the plan |
| `src/model/` | SPEC §5 as pure functions: month states, projection, traffic light, indicators, formats |
| `src/price/` | BTC/USD sources, the choice of price per month, the closed-month cache |
| `src/charts/` | Chart geometry, pure; the SVG components draw it |
| `src/components/`, `src/views/` | Preact UI. Views read the store, never a relay |
| `src/i18n/` | `en.ts` (source) and `es.ts` catalogues, and locale selection |
| `tests/fixtures/snapshot/` | Real signed events, byte for byte, from `scripts/fetch-fixtures.mjs` |
| `tests/e2e/` | Playwright: hermetic against the fixtures, plus `live.spec.ts` against the real relays |

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server, against the real relays |
| `npm test` | Unit and integration tests |
| `npm run test:coverage` | The same, with the coverage thresholds enforced |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run format:check` | Prettier, read-only (`npm run format` writes) |
| `npm run build` | Typecheck, then static output to `dist/` |
| `npm run check:size` | The JavaScript bundle against its 120 KB gzip budget |
| `npm run test:e2e` | Playwright, hermetic, with axe |
| `npm run test:e2e:live` | Playwright against the real relays |
| `npm run fixtures` | Regenerates `tests/fixtures/snapshot/` from the relays |

Before opening or updating a pull request, all of these pass and you report
the real result: `format:check`, `lint`, `typecheck`, `test:coverage`,
`build`, `check:size`, `test:e2e`. CI runs the same set and does not deploy
when one fails.

## How code is written here

- **Tests first.** `src/nostr/` and `src/model/` — where a bug is silent — are
  held at 100% on lines, branches and functions; the rest at 80%.
  `npm run test:coverage` enforces both. Tests are named for the behaviour
  they pin, arranged Arrange–Act–Assert, and the values of SPEC §8.1 are
  asserted as written there.
- **The spec's numbers are the tests' numbers.** The seven traffic-light cases
  of §5.6, the projection of 398,766 sats, 315.03 USD for February 2027:
  if a change moves one of them, the change is wrong or the spec changes first.
- **Pure where it can be.** What to render is a function of the verified
  bytes, the plan, the prices and `coverage.last_event_at` — never the
  reader's clock. The relay layer never touches the DOM; a component never
  decides what a figure is.
- **Immutable data.** Return new values; do not mutate what you were handed.
- **Small files, organised by domain.** Under 400 lines. Extract rather than
  append.
- **Absence is explicit.** No silent catch, no `?? 0` standing in for a figure
  nobody published.
- **Comments say why.** The what is in the code.

## Things that bite

- **`src/nostr/canonical.ts`** re-serialises a payload the way bestiario
  hashed it (struct declaration order; `ratio` and `fiat` always with a
  decimal point), not the way it arrived. Hashing the bytes as received
  verifies nothing. It is shared with bestiario-fe: fix it there too.
- **Fixtures are real events.** Do not hand-edit one: an edited event fails
  its own signature, which is the point. Regenerate with `npm run fixtures`
  and review the diff like code. Tests that need a *new* index or a restated
  document re-sign the fixtures with a throwaway key
  (`tests/store/fake-relays.ts`), never the publisher's.
- **The index is the trigger.** A document is shown only once an index naming
  its hash has arrived; a new index refetches exactly the documents whose hash
  moved; a higher `revision` is shown as a restatement, never swapped in
  silently.
- **`series:dev-fees:monthly:2027` does not exist until January 2027.** It is
  requested anyway and its months render as "no data". That is correct.
- **Two catalogues.** A new user-facing string is a key in
  `src/i18n/strings.ts` with a real translation in both `en.ts` and `es.ts`.
  The catalogue tests check that none is blank and that Spanish is not quietly
  still English. Numbers go through `src/model/format.ts`, which follows the
  active locale.
- **Accessibility is a requirement, not a polish pass.** WCAG 2.2 AA: real
  tables with headers, 4.5:1 contrast, no meaning carried by colour alone
  (every light has its text and its own icon), `prefers-reduced-motion`
  honoured. axe runs in the end-to-end suite.
- **The look is Mostro's.** Palette, type and glass cards follow
  mostro.network and mostro.community (`#1D212C`, `#8CC63F`, Inter, JetBrains
  Mono). Keep new UI inside that system; the tokens are at the top of
  `src/styles/base.css`.

## Git and GitHub

- Branch from `main`; never commit to it directly.
- Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `chore:`,
  `refactor:`, `perf:`, `ci:`. The subject says what changed; the body says
  why it needed to.
- For a fix, the first commit is `test:` and adds a regression test that fails
  on `main`.
- A pull request describes the change, the reasoning, and a test plan a
  reviewer can run. Mark what you could not verify — an unverified step said
  plainly is worth more than a checked box that was not.
- Changing a target is a pull request to `config/plan-2027.json` and nothing
  else; the validation and the tests say whether it is coherent.
- Answer review comments. Fix what is real, and say briefly why for what is
  not.
- In English. See the top of this file.

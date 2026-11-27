# Golazo

The progress board of the **Mostro 2027 plan**: is the network on its way to
multiplying the monthly dev fee by ten — 2,970,000 sats in November 2027, or
1,772 USD at the reference price?

Golazo is a static site with no server and no API of its own. It reads the
statistics [bestiario](https://github.com/MostroP2P/bestiario) signs and
publishes on Nostr, verifies every one of them in your browser — author,
Schnorr signature, and payload hash against bestiario's index — and compares
them with the monthly targets in [`config/plan-2027.json`](config/plan-2027.json).
It answers four questions at a glance:

- Is this month green, yellow or red?
- How much has the dev fund received so far, and what is the projection?
- How far is the final target?
- Which lever is failing: completed orders, completion rate, average ticket or
  active nodes?

The full specification is [`docs/SPEC.md`](docs/SPEC.md); instructions for
contributors and coding agents are in [`AGENTS.md`](AGENTS.md).

## How a month is judged

Each month's target exists in two units and is met with either: the target in
sats (adoption), or the same sats at the fixed reference price of
59,665 USD/BTC. The real fee is converted at that month's own BTC price, so a
BTC rally can carry a month the sats alone did not.

| Light | When |
| --- | --- |
| On target | sats ≥ target, or USD ≥ target in USD |
| Above the floor | otherwise, sats ≥ floor, or USD ≥ floor in USD |
| Below the floor | below the floor in both measures |
| No data | the figure is absent — never painted red |

The month in progress is judged on its projection and labelled *projected*.
Two closed months in a row below the floor raise a banner: the plan must be
reviewed.

## Running it

```sh
npm ci
npm run dev            # against the real relays
npm test               # unit and integration
npm run test:coverage  # with the thresholds: 100% for src/nostr and src/model, 80% overall
npm run test:e2e       # Playwright + axe, hermetic, over the real signed fixtures
npm run test:e2e:live  # Playwright against the real relays
npm run build          # static output in dist/
```

`VITE_PUBLISHER_PUBKEY` overrides the publisher key at build time and
`VITE_BASE` sets the base path (`/` for a custom domain, `/golazo/` for a
project page). Neither is ever read at runtime.

## Changing a target

Edit `config/plan-2027.json` in a pull request. The plan is validated at build
and at start-up — every month present and consecutive, floor below target,
targets growing — and an invalid plan shows its errors and no traffic light.
No code changes.

## Provenance

`src/nostr/` (`address`, `canonical`, `verify`, `hash`, `pool`, `documents`)
and its tests come from
[bestiario-fe](https://github.com/MostroP2P/bestiario-fe), the code behind
[mostro.world](https://mostro.world), so Golazo trusts a figure for exactly
the same reasons. `pool.ts` adds one thing: a standing subscription reports
when the relays drop it, so the store can reconnect with backoff.

## Licence

GPL-3.0-only, like bestiario-fe, whose code it reuses. See [`LICENSE`](LICENSE).

# Spec: Golazo, the progress board for the Mostro 2027 plan

Nov 27, 2026 · @grunch

## 0. For the implementer

**Golazo** is a static website that shows, in real time and without a server, how the Mostro network is progressing toward the target of the 2027 plan: that in November 2027 the dev fund receives 2,970,000 sats in the month, or its equivalent of 1,772 USD at the reference price. It reads the signed statistics that bestiario publishes on Nostr, verifies them in the browser the way [bestiario-fe](https://github.com/MostroP2P/bestiario-fe) does (the code behind [mostro.world](https://mostro.world)), and compares them with the plan's monthly targets.

This document is the single source of truth for building Golazo. Everything needed is here: the plan, the complete targets, the color rules with numeric examples, the exact data format and the tests with expected results. If something is not defined, it is not invented: ask.

What must be delivered:

1. A `MostroP2P/golazo` repository (GPL-3.0 license, because it reuses code from bestiario-fe) with code, tests and this spec in `docs/SPEC.md`.
2. A static site deployed on GitHub Pages that answers the questions in section 6 in under 10 seconds.
3. A `config/plan-2027.json` file with the targets, which the team can edit without touching code.

How to read it: sections 1 and 2 explain what is measured and why; 3 and 4, where the data comes from; 5 is normative (formulas and rules are not open to interpretation); 6 defines the interface; 7, the architecture; 8, how to check that it is correct. "MUST" is mandatory; "MAY" is optional.

Fixed conventions:

- All dates and months are computed in **UTC**. A month is the interval `[YYYY-MM-01T00:00Z, first day of the next month)`.
- Bitcoin amounts are handled as **whole sats**. USD values are rounded only when displayed, never in calculations.
- "Plan month" runs from 1 (December 2026) to 12 (November 2027).
- Code, comments, documentation, commits and pull requests are in English, like every MostroP2P repository. The interface ships in English (the source catalogue, `src/i18n/en.ts`) and Spanish (`src/i18n/es.ts`), chosen from the browser's language with a picker in the header; more locales (Italian first) are added as further catalogues.

## 1. The 2027 plan that Golazo tracks

The [Mostro 2027 work plan](https://claude.ai/artifact/1BbThjULf11tmF1tDApGF4) sets a single main goal: **multiply the monthly dev fee by 10 in 12 months**. Golazo exists so that the team and the community can see, every day, whether we are on track to achieve it.

### 1.1 What the dev fee is

Each Mostro node charges a fee per completed order (between 0.5% and 1% depending on the node) and sends 30% of that fee to the development fund, over Lightning, to `dev@pay.mostro.foundation`. Each payment is published as a Nostr event and bestiario adds them up in the `series:dev-fees:*` document. The plan does **not** ask operators to raise that 30%: growth has to come from adoption.

### 1.2 Starting point (base)

Average from September 1 to November 25, 2026 (85.6 days), scaled to a 30-day month:

| Metric | Base |
| --- | --- |
| Dev fee | 297,000 sats/month (177 USD at 59,665 USD/BTC) |
| Orders created | 6,088/month |
| Orders completed | 1,278/month (43 per day) |
| Completion rate | 21.0% |
| Average ticket | 119,346 sats |
| Share of volume that reaches the dev fund | 0.195% |
| Active nodes | 10 |

### 1.3 The target and how it is built

- **Final target (month 12, November 2027):** 2,970,000 sats of dev fee in the month, or 1,772 USD computed at the reference price.
- **Final floor (×5):** 1,485,000 sats, or 886 reference USD.
- **Required pace:** the dev fee grows 21.2% per month (because 1.212^12 ≈ 10). The floor grows 14.4% per month.
- **Levers:** completed orders ×7 (from 1,278 to 8,950 per month) and average ticket ×1.43 (from 119,346 to 170,000 sats). Completed orders come from orders created ×4.2 (6,088 → 25,570) and completion rate ×1.67 (21% → 35%).
- **Assumption:** 0.195% of volume reaches the dev fund all year.

### 1.4 The target has two measures

The price of BTC is not controlled by the team. That is why each monthly target exists in two units and **is met with either of the two**:

- **Target in sats:** the number in the table in section 2.
- **Target in USD:** the target in sats converted at the **fixed reference price of 59,665 USD/BTC** (the price on November 25, 2026). That value does not change all year: the November 2027 target is always 1,772 USD.

The **actual** dev fee, by contrast, is converted to USD at the BTC price **of that month** (section 5.4). So if BTC doubles, collecting 1,485,000 sats in November 2027 is worth 1,772 USD and counts as target met. If BTC falls, the reference remains the target in sats, which measures adoption.

Clarification: the current plan says in one paragraph that the actual value is converted "at the reference price, not the day's price". That sentence is a mistake, because with the reference price both measures always give the same result. **This spec prevails**; the plan is corrected.

### 1.5 Stages of the year

| Quarter | Plan months | Focus | Closing target (dev fee of the last month) |
| --- | --- | --- | --- |
| T1 | 1–3 (Dec 2026–Feb 2027) | Convert what already arrives (completion rate) | 528,000 sats · 315 USD |
| T2 | 4–6 (Mar–May 2027) | Open communities, guides, simple installation | 939,000 sats · 560 USD |
| T3 | 7–9 (Jun–Aug 2027) | Communities without a Lightning node (Cashu) | 1,670,000 sats · 996 USD |
| T4 | 10–12 (Sep–Nov 2027) | Consolidate | 2,970,000 sats · 1,772 USD |

The team reviews progress on the first Monday of each month. Two consecutive months in red require the plan to be reviewed. Golazo is the tool for that review.

## 2. Month-by-month targets

These are all the targets Golazo compares against. The USD columns are **not stored**: they are computed as `sats × 59,665 ÷ 100,000,000` and displayed rounded to the nearest integer.

| Plan month | Month (UTC) | Dev fee target (sats) | Target (ref. USD) | Dev fee floor (sats) | Floor (ref. USD) | Completed orders per day | Completion rate | Average ticket (sats) | Orders created per month | Active nodes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 2026-12 | 360,000 | 215 | 340,000 | 203 | 50 | 21.9% | 123,000 | 6,860 | 11 |
| 2 | 2027-01 | 436,000 | 260 | 388,000 | 231 | 59 | 22.9% | 127,000 | 7,730 | 11 |
| 3 | 2027-02 | 528,000 | 315 | 444,000 | 265 | 69 | 23.9% | 130,000 | 8,720 | 12 |
| 4 | 2027-03 | 640,000 | 382 | 508,000 | 303 | 82 | 24.9% | 134,000 | 9,820 | 13 |
| 5 | 2027-04 | 775,000 | 462 | 581,000 | 347 | 96 | 26.0% | 138,000 | 11,070 | 13 |
| 6 | 2027-05 | 939,000 | 560 | 664,000 | 396 | 113 | 27.1% | 143,000 | 12,480 | 14 |
| 7 | 2027-06 | 1,138,000 | 679 | 759,000 | 453 | 133 | 28.3% | 147,000 | 14,060 | 15 |
| 8 | 2027-07 | 1,379,000 | 823 | 868,000 | 518 | 156 | 29.5% | 151,000 | 15,850 | 16 |
| 9 | 2027-08 | 1,670,000 | 996 | 993,000 | 592 | 183 | 30.8% | 156,000 | 17,860 | 17 |
| 10 | 2027-09 | 2,023,000 | 1,207 | 1,136,000 | 678 | 216 | 32.1% | 161,000 | 20,130 | 18 |
| 11 | 2027-10 | 2,451,000 | 1,462 | 1,299,000 | 775 | 254 | 33.5% | 166,000 | 22,690 | 19 |
| 12 | 2027-11 | 2,970,000 | 1,772 | 1,485,000 | 886 | 298 | 35.0% | 170,000 | 25,570 | 20 |

Months 3, 6, 9 and 12 are quarter closes (section 1.5). The sum of the 12 monthly targets is 15,309,000 sats: that is the cumulative target for the year.

The `config/plan-2027.json` file MUST have exactly this shape and these values. Golazo validates it at startup (all months present, consecutive, `piso < meta`, increasing targets) and, if it is not valid, shows the error and no traffic light.

```json
{
  "version": 1,
  "plan": "Mostro 2027 x10",
  "referencePriceUsd": 59665,
  "base": {
    "period": { "from": "2026-09-01", "until": "2026-11-25" },
    "devFeeSats": 297000, "completedPerDay": 43, "completionRate": 0.21,
    "ticketSats": 119346, "createdPerMonth": 6088, "activeNodes": 10
  },
  "history": ["2026-09", "2026-10", "2026-11"],
  "months": [
    { "n": 1,  "month": "2026-12", "metaSats": 360000,  "pisoSats": 340000,  "completedPerDay": 50,  "completionRate": 0.219, "ticketSats": 123000, "createdPerMonth": 6860,  "activeNodes": 11 },
    { "n": 2,  "month": "2027-01", "metaSats": 436000,  "pisoSats": 388000,  "completedPerDay": 59,  "completionRate": 0.229, "ticketSats": 127000, "createdPerMonth": 7730,  "activeNodes": 11 },
    { "n": 3,  "month": "2027-02", "metaSats": 528000,  "pisoSats": 444000,  "completedPerDay": 69,  "completionRate": 0.239, "ticketSats": 130000, "createdPerMonth": 8720,  "activeNodes": 12, "quarterClose": "T1" },
    { "n": 4,  "month": "2027-03", "metaSats": 640000,  "pisoSats": 508000,  "completedPerDay": 82,  "completionRate": 0.249, "ticketSats": 134000, "createdPerMonth": 9820,  "activeNodes": 13 },
    { "n": 5,  "month": "2027-04", "metaSats": 775000,  "pisoSats": 581000,  "completedPerDay": 96,  "completionRate": 0.260, "ticketSats": 138000, "createdPerMonth": 11070, "activeNodes": 13 },
    { "n": 6,  "month": "2027-05", "metaSats": 939000,  "pisoSats": 664000,  "completedPerDay": 113, "completionRate": 0.271, "ticketSats": 143000, "createdPerMonth": 12480, "activeNodes": 14, "quarterClose": "T2" },
    { "n": 7,  "month": "2027-06", "metaSats": 1138000, "pisoSats": 759000,  "completedPerDay": 133, "completionRate": 0.283, "ticketSats": 147000, "createdPerMonth": 14060, "activeNodes": 15 },
    { "n": 8,  "month": "2027-07", "metaSats": 1379000, "pisoSats": 868000,  "completedPerDay": 156, "completionRate": 0.295, "ticketSats": 151000, "createdPerMonth": 15850, "activeNodes": 16 },
    { "n": 9,  "month": "2027-08", "metaSats": 1670000, "pisoSats": 993000,  "completedPerDay": 183, "completionRate": 0.308, "ticketSats": 156000, "createdPerMonth": 17860, "activeNodes": 17, "quarterClose": "T3" },
    { "n": 10, "month": "2027-09", "metaSats": 2023000, "pisoSats": 1136000, "completedPerDay": 216, "completionRate": 0.321, "ticketSats": 161000, "createdPerMonth": 20130, "activeNodes": 18 },
    { "n": 11, "month": "2027-10", "metaSats": 2451000, "pisoSats": 1299000, "completedPerDay": 254, "completionRate": 0.335, "ticketSats": 166000, "createdPerMonth": 22690, "activeNodes": 19 },
    { "n": 12, "month": "2027-11", "metaSats": 2970000, "pisoSats": 1485000, "completedPerDay": 298, "completionRate": 0.350, "ticketSats": 170000, "createdPerMonth": 25570, "activeNodes": 20, "quarterClose": "T4" }
  ],
  "monthlyPriceUsd": {}
}
```

`monthlyPriceUsd` is an optional `"YYYY-MM": price` map with which the team freezes the BTC price of a closed month (section 5.4). Empty at the start.

If the team adjusts the curve in a quarterly review, it changes this file through a pull request; the code does not change.

## 3. How bestiario and bestiario-fe work

Golazo does not invent a new way to read data: it copies bestiario-fe's. Before writing code, the implementer MUST read `docs/SPEC.md` and `AGENTS.md` in [bestiario-fe](https://github.com/MostroP2P/bestiario-fe) (reviewed at commit `6cbb5cc`, Nov 22, 2026). This section summarizes what matters for Golazo.

### 3.1 bestiario, the publisher

[bestiario](https://github.com/MostroP2P/bestiario) is a daemon that indexes the public events of Mostro nodes (orders kind 38383, disputes kind 38386, dev fee payments) and publishes the computed figures as **signed Nostr events**:

| Field | Value |
| --- | --- |
| Kind | `30666` (addressable event: the newest one with the same `d` replaces the previous one) |
| Publisher (hex pubkey) | `000001204177f1e40e2732aa6a01648fc545b73883f2b0ea6fbc91d3ea5a5b9f` |
| Relays it publishes to | `wss://relay.mostro.network`, `wss://nos.lol` |
| Fallback relays used by bestiario-fe | `wss://mostro-p2p.tech`, `wss://relay.shadowbip.com` |
| Frequency | Recomputes and republishes several times per day |

Each event has the tags `d` (document address), `s` (snapshot), `t=bestiario`, `resolution`, `period`, `revision` and `schema_version`. The `content` is a JSON ("envelope") with this shape:

```json
{
  "schema_version": 1,
  "snapshot_id": "20261127T183726Z",
  "generated_at": "2026-11-27T18:37:26+00:00",
  "revision": 3714,
  "restated_at": "2026-11-27T18:37:26+00:00",
  "restated_because": "backfill",
  "payload": { ... }
}
```

There are two shapes of `payload`:

- **Window** (`summary:30d`, `orders:7d`, etc.): `{ "range": {"from", "until"}, "metrics": [{"name", "kind", "unit", "value", "error?"}] }`.
- **Series** (`series:dev-fees:monthly:2026`, etc.): `{ "period": {"from", "until"}, "resolution", "columns": [{"name", "unit", "kind?"}], "rows": [["2026-11", 355908, 1436, ...], ...] }`. The first column is always `date`.

Possible units: `count`, `sats`, `seconds`, `ratio`, `fiat`, `text`, `missing`, `date`. A `null` value means **absence**, never zero.

Address (`d`) grammar, exact and lowercase:

```
d          = "index" / report ":" window / "series:" report ":" resolution ":" bucket
report     = "orders" / "volume" / "disputes" / "dev-fees" / "summary" / "instances" / "market" / "compare"
window     = "24h" / "7d" / "30d" / "90d" / "all"
resolution = "daily" / "weekly" / "monthly"
bucket     = YYYY "-" MM   ; daily and weekly
           / YYYY          ; monthly
```

Series exist only for `orders`, `volume`, `disputes` and `dev-fees`. **The 2027 monthly series (`series:dev-fees:monthly:2027`) does not exist yet**: it will appear once there is data for January 2027. Golazo MUST request it anyway and tolerate its absence.

### 3.2 The index

The `d="index"` document lists every published document with its hash. Golazo uses it the same way bestiario-fe does:

```json
{
  "schema_version": 1,
  "snapshot_id": "...",
  "generated_at": "...",
  "publisher": { "name": "bestiario", "version": "0.2.0" },
  "coverage": { "first_event_at": "2026-01-26T20:21:55+00:00", "last_event_at": "2026-11-27T18:37:00+00:00" },
  "resolutions": { "daily": {"from": "2026-01", "until": "2026-11"}, "monthly": {"from": "2026", "until": "2026"} },
  "documents": [ { "d": "summary:24h", "hash": "18b4...", "revision": 19337, "updated_at": "...", "restated_at": "...", "restated_because": "backfill" } ]
}
```

`coverage.last_event_at` is **how far the data actually reaches**. Golazo uses it as "now" to compute the current month (section 5.2).

### 3.3 Verification: how bestiario-fe trusts a figure

bestiario-fe has two principles that Golazo MUST inherit:

1. **Trust a key, not a server.** Every figure on screen comes from an event signed by the publisher and verified in the browser. The publisher key is fixed at build time (`VITE_PUBLISHER_PUBKEY`), never read from the URL or from a file next to the page.
2. **The site never invents a number.** `null` is shown as absence. A document that did not arrive is shown as "unavailable" ("no disponible"); one that failed verification is shown as "unverified" ("no verificado"). In neither case is a figure drawn.

Each event goes through three checks, in this order (`src/nostr/verify.ts`):

1. `pubkey` equal to the configured publisher.
2. Valid Schnorr signature (`verifyEvent` from `nostr-tools`, over a fresh copy of the seven signed fields).
3. SHA-256 of the `payload` equal to the `hash` the index names for that `d`.

Step 3 has a pitfall documented in the bestiario-fe README: bestiario computes the hash over a different serialization from the one it sends (keys in the declaration order of the Rust struct, not alphabetical; `ratio` and `fiat` always with a decimal point, for example `422550.0`). Hashing the bytes as they arrive verifies 0 of 32 documents. `src/nostr/canonical.ts` reproduces the correct serialization. **Golazo MUST reuse `canonical.ts`, `verify.ts`, `hash.ts`, `address.ts`, `pool.ts` and `documents.ts` from bestiario-fe** (copied with their history or as a shared dependency), together with their tests on real events.

### 3.4 Loading algorithm and real time

Same as bestiario-fe (`docs/SPEC.md` §6):

1. Open a connection to all relays in parallel; one that is down does not block another.
2. Request the index: `{"kinds":[30666], "authors":[PUBLISHER], "#d":["index"], "limit":1}`. Across all relays, keep the verified event with the highest `created_at`.
3. Request in **a single** `REQ` all the documents Golazo needs (section 4) with a combined `#d`.
4. Verify each one (3.3). If the hash does not match, request it once more; if it fails again, that document stays "unverified".
5. Keep a subscription open to the index and to those documents. **The index rules:** when a new one arrives, the hashes are compared and only the documents that changed are requested again. A document that arrives before its index is stored and not shown until the index that names it arrives.
6. If a document's `revision` goes up relative to what the user is seeing, it is shown as a **restatement** with its `restated_because`; it is not changed silently.
7. Reconnection with exponential backoff and random jitter: initial 500 ms, maximum 30 s. When returning to the tab (`visibilitychange`), the index is checked immediately.
8. Timeouts: 8 s to obtain the index before the error state; 8 s per document before "unavailable". Stale-data warning if the signed `created_at` of the index is more than 6 hours old; alarm if it is more than 24 hours old.

Cache in `localStorage` per `d`: `{hash, payload, createdAt, revision}`. It is only used if the hash matches the current index. If storage fails, the site works anyway.

## 4. Which documents Golazo reads

Golazo requests these `d` values in a single `REQ` (in addition to `index`). `<año>` (year) takes the values 2026 and 2027; `<mes>` (month) takes each month from `2026-09` up to the month of `coverage.last_event_at`, not going past `2027-11`.

| Document | Columns or metrics it uses | What for |
| --- | --- | --- |
| `series:dev-fees:monthly:<año>` | `date`, `total_sats` (sats), `paid` (count), `coverage` (ratio) | Actual dev fee for each month. Main source for the traffic light |
| `series:orders:monthly:<año>` | `date`, `created`, `completed` (count) | Orders per day and completion rate |
| `series:volume:monthly:<año>` | `date`, `sats`, `completed`, `ticket_avg` (sats) | Average ticket and volume |
| `series:dev-fees:daily:<mes>` | `date` (day), `total_sats` | Daily chart for the current month and cross-check |
| `series:orders:daily:<mes>` | `date`, `created`, `completed` | Daily pace for the current month |
| `summary:30d` | `summary.active_instances` (count) | Active nodes in the last 30 days |

Combination rules:

- Each month's row is looked up by its `date` (`"2026-11"` in monthly series, `"2026-11-27"` in daily ones). If the row does not exist or its value is `null`, the month's data is **absent**, not zero.
- For closed months, the monthly series rules. If the monthly series is missing but all the daily series for the month are present, the daily values MAY be summed and marked "computed from the daily series" ("calculado desde la serie diaria").
- For the current month, the monthly row is used (bestiario updates it as the month progresses), and the daily series only for the pace chart.
- If the dev fees `coverage` for a month is less than 0.95, the month is shown with the warning "partial payment coverage: X%" ("cobertura parcial de pagos: X %") (bestiario could not see all the payments for that month).

Actual values as of Nov 27, 2026, 18:37 UTC, for orientation:

| Month | Dev fee (sats) | Orders created | Orders completed | Average ticket (sats) |
| --- | --- | --- | --- | --- |
| 2026-09 | 238,433 | 5,747 | 1,079 | 102,943 |
| 2026-10 | 283,798 | 5,684 | 1,235 | 113,481 |
| 2026-11 (partial, 26.78 days) | 355,908 | 6,525 | 1,461 | 140,386 |

Active nodes (`summary:30d`): 10.

## 5. Calculations (normative)

This section defines every number and every color. The formulas are implemented exactly as written, as pure functions with tests (section 8).

### 5.1 State of each month

Let `ahora` (now) `= index.coverage.last_event_at` (not the browser's clock). For each month `m`, with `inicio(m)` (start) the first instant of the month and `fin(m)` (end) the first instant of the next month:

| State | Condition |
| --- | --- |
| `previo` (before plan) | `m` is in `history` (Sep, Oct, Nov 2026): shown without color |
| `cerrado` (closed) | `m` is a plan month and `ahora ≥ fin(m)` |
| `en curso` (in progress) | `m` is a plan month and `inicio(m) ≤ ahora < fin(m)` |
| `futuro` (future) | `m` is a plan month and `ahora < inicio(m)` |

Before December 1, 2026 no plan month is in progress: the current month is November 2026 (`previo`) and it is compared with the base.

### 5.2 Value being evaluated (V)

- `real(m)` = `total_sats` of row `m` in `series:dev-fees:monthly`.
- `diasMes(m)` = number of days in the month (28 to 31).
- `diasTranscurridos(m)` (elapsed days) = `(ahora − inicio(m)) / 86,400,000 ms`, with decimals.
- **Closed month:** `V = real(m)`.
- **Month in progress:** `V = projection = real(m) × diasMes(m) / diasTranscurridos(m)`. If `diasTranscurridos < 3`, there is no projection: only the accumulated amount is shown, with the state "insufficient data" ("datos insuficientes") (no color).
- If `real(m)` is absent, `V` is absent and the month is left as "no data" ("sin datos") (no color, never red).

Example with real data: as of Nov 27, 2026 18:37 UTC, November has run 26.776 days and 355,908 sats; the projection is `355,908 × 30 / 26.776 = 398,766 sats`.

### 5.3 Targets in USD

With `REF = 59,665` (`referencePriceUsd`):

- `metaUsd(m) = metaSats(m) × REF / 100,000,000`
- `pisoUsd(m) = pisoSats(m) × REF / 100,000,000`

Example: February 2027 → target 528,000 sats = **315.03 USD**; floor 444,000 sats = **264.91 USD**.

### 5.4 BTC price for the month (P) and actual value in USD

`realUsd(m) = V × P(m) / 100,000,000`. The price `P(m)` is chosen in this order:

1. If `monthlyPriceUsd[m]` exists in the configuration, that one is used (price frozen by the team).
2. **Closed month:** simple average of the daily BTC/USD prices for the month, from `https://api.coingecko.com/api/v3/coins/bitcoin/market_chart/range?vs_currency=usd&from=<inicio>&to=<fin>` (Unix seconds). It is cached: a closed month does not change.
3. **Month in progress:** current price from `https://api.yadio.io/exrates/BTC` (field `BTC.USD`); if that fails, `https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd`. Refreshed every 5 minutes.
4. If no source responds: `P = REF` and the warning "BTC price unavailable; the USD measure equals the sats measure" ("precio de BTC no disponible; la medida en USD equivale a la de sats") is shown.

On every screen where an actual USD value appears, the price used and where it came from are indicated.

### 5.5 Traffic light

For a `cerrado` or `en curso` month with `V` present:

```
if V >= metaSats  or  realUsd >= metaUsd        -> GREEN   "On target"
else, if V >= pisoSats  or  realUsd >= pisoUsd  -> YELLOW  "Above the floor"
otherwise                                       -> RED     "Below the floor"
```

Comparisons use unrounded values and `>=` (matching the target means meeting it). For the month in progress the state carries the label **"projected"** ("proyectado"): it is a prediction, not a result. Only `cerrado` months count as green, yellow or red in the year summary and in the "two reds in a row" rule.

Color never stands alone: it always comes with the text ("On target" ("En meta"), "Above the floor" ("Sobre el piso"), "Below the floor" ("Bajo el piso")) and a distinct icon for each state.

### 5.6 Traffic light examples (February 2027, closed)

Target 528,000 sats (315.03 USD) · floor 444,000 sats (264.91 USD).

| Case | V (sats) | P (USD/BTC) | realUsd | Result | Why |
| --- | --- | --- | --- | --- | --- |
| A | 540,000 | 60,000 | 324.00 | GREEN | sats ≥ target |
| B | 470,000 | 80,000 | 376.00 | GREEN | sats below the target, but USD ≥ 315.03 (BTC went up) |
| C | 470,000 | 60,000 | 282.00 | YELLOW | does not reach it in either measure; sats ≥ floor |
| D | 400,000 | 70,000 | 280.00 | YELLOW | sats below the floor, but USD ≥ 264.91 |
| E | 400,000 | 55,000 | 220.00 | RED | below the floor in both measures |
| F | 528,000 | 40,000 | 211.20 | GREEN | sats = exact target; USD does not matter |
| G | absent | 60,000 | — | NO DATA | never painted red for lack of data |

These seven cases MUST be unit tests.

### 5.7 Supporting metrics

All of them are "more is better": they are on target if `value ≥ target for the month` (or the base for months before the plan).

| Metric | Formula | Closed month | Month in progress |
| --- | --- | --- | --- |
| Completed orders per day | `completed / días` | `días = diasMes` | `días = diasTranscurridos` |
| Completion rate | `completed / created` | same | same (absent if `created = 0`) |
| Average ticket | `ticket_avg` from `series:volume:monthly` | same | same |
| Average ticket in USD | `ticket_avg × P(m) / 1e8` | same | same |
| Active nodes | `summary.active_instances` from `summary:30d` | no historical data ("—") | current value |

Real example (November 2026, in progress): `1,461 / 26.776 = 54.6` orders per day; `1,461 / 6,525 = 22.4%`.

### 5.8 Year indicators

- **Progress toward the final target:** `(V(current month) − 297,000) / (2,970,000 − 297,000)`, measured from the base: 0% at the base, 100% on the ×10 target, below 0% under the base. Measuring from zero would start the bar a tenth full before anything had grown. The ×5 floor sits at `(1,485,000 − 297,000) / (2,970,000 − 297,000) = 44.4%` of the bar.
- **Growth versus the previous month:** `V(m) / real(m−1) − 1`, compared with the required 21.2%.
- **Required pace from today:** `(2,970,000 / V(m))^(1 / (12 − n)) − 1`, where `n` is the number of the plan month in progress. If `n = 12`, it is not shown. Before the plan, `n = 0` and November's `V` are used.
- **Year to date:** sum of `real(m)` for the plan months up to today (the month in progress with its accumulated value, not projected) against the sum of targets up to the previous month plus `metaSats(m) × diasTranscurridos / diasMes` for the month in progress. Annual target: 15,309,000 sats.
- **Closed months on target:** number of `cerrado` months in green over the total number of closed months.
- **Review alert:** if the last two closed months are in red, banner "Two months in a row below the floor: the plan must be reviewed" ("Dos meses seguidos bajo el piso: el plan debe revisarse").
- **Quarter closes:** the state of months 3, 6, 9 and 12.

### 5.9 Edge cases

- **The 2027 series does not exist yet:** it is requested anyway; the 2027 months stay as "no data" until it appears.
- **bestiario restates a closed month** (`revision` goes up): the state is recomputed and the warning "restated: \<restated\_because>" ("re-calculado: \<restated\_because>") is shown.
- **The index is more than 24 hours old:** the figures are shown with the stale-data alarm; the month in progress is not projected with a stale `ahora` without flagging it.
- **Month change:** when `ahora` moves into a new month, the previous month becomes `cerrado` and its state stops saying "projected".
- **An unverified document:** the figures that depend on it are not shown and the block says why.
- **After November 2027:** the board stays as the plan's close-out, with the final result of the 12 months.

## 6. Screens

Golazo answers four questions in under 10 seconds: **Are we green, yellow or red this month? How much have we collected and how much do we project? How far are we from the final target? Which lever is failing?** Two hash routes, like bestiario-fe: `#/` (board) and `#/confianza` (verification).

### 6.1 Board `#/`, from top to bottom

```
+--------------------------------------------------------------------------------+
| GOLAZO · Mostro 2027 x10           [Live · data as of Nov 27 18:37 UTC] [↻]    |
+----------------------------------------------+---------------------------------+
| PLAN MONTH 3 · FEB 2027 · projected          | YEAR                            |
| [● GREEN · On target]                        | Closed months on target: 2 of 2 |
| 512,400 sats accumulated in 25.3 of 28 days  | Growth vs Jan: +18.9%           |
| Projection: 567,100 sats · ≈ 380 USD         |   (required +21.2%)             |
| Target 528,000 sats or 315 USD · floor 444,000 | Required pace from today: +23%|
| [===========================|=====>      ]   | Year to date: 1.32 M of 1.32 M  |
| Progress from base to final target: 10.1%    | Final target: 1,772 USD of today|
+----------------------------------------------+---------------------------------+
| Orders/day     | Completion    | Average ticket         | Active nodes         |
| 71 / target 69 | 24.2% / 23.9% | 131,200 sats / 130,000 | 12 / 12              |
+--------------------------------------------------------------------------------+
| Chart: actual monthly dev fee (bars) vs target (line) and floor (dotted)       |
| Sep 26 ... Nov 27, vertical line "plan starts" and "today"                     |
+--------------------------------------------------------------------------------+
| Current month pace: cumulative daily dev fee vs prorated target line           |
+--------------------------------------------------------------------------------+
| Month-by-month table (13 rows including the base)                              |
+--------------------------------------------------------------------------------+
| Quarter closes: T1 ●  T2 ○  T3 ○  T4 ○                                         |
+--------------------------------------------------------------------------------+
```

(The numbers in the drawing are illustrative, not data.)

1. **Header.** Name, connection state ("Live" ("En vivo"), "Cached data" ("Datos en caché"), "Offline" ("Sin conexión")), date and time of `ahora` in UTC, stale-data warning or alarm (3.4), a button to force a reload and a link to `#/confianza`.
2. **Month card.** Number and name of the plan month; traffic-light state with text and icon, plus the "projected" label if it is the month in progress; accumulated dev fee and elapsed days; projection in sats and in USD with the price used; target and floor for the month in sats and USD; progress bar from the base toward the final target (5.8), starting empty at the base, with marks for the ×5 floor and the ×10 target. Before the plan, the card says "Before the plan · November 2026" ("Antes del plan · noviembre 2026"), compares against the base and shows the first target (360,000 sats in December).
3. **Year summary.** The indicators from section 5.8 and the review banner when applicable.
4. **Four indicators** (5.7): value, target for the month, final target and "On target" or "Below" ("Por debajo") as text.
5. **Annual chart.** Dev fee bars per month from September 2026; the bar for the month in progress shows the accumulated amount in the "actual" color and the projection above it in a light tone; target line (12 points, with the quarter closes larger) and dotted floor line, both starting at the 297,000-sats base; a "plan starts" ("arranca el plan") mark. Axis starts at zero. Every bar and point has a tooltip with the exact value.
6. **Current month pace.** Dev fee accumulated day by day (from `series:dev-fees:daily:<mes>`) against the prorated target line `metaSats × day / diasMes` and the floor line.
7. **Month-by-month table.** Columns: month, target (sats), target (ref. USD), floor (sats), actual (sats, with "proj." ("proy.") if it is the month in progress), price used, actual (USD), % of target, orders per day vs target, completion rate vs target, ticket vs target, state. The month in progress row is highlighted. Future months show only the targets.
8. **Quarter closes.** Four marks with their state.
9. **Footer.** "Figures signed by bestiario and verified in this browser. A signature proves who published the figure, not that it is correct." ("Cifras firmadas por bestiario y verificadas en este navegador. Una firma prueba quién publicó la cifra, no que sea correcta.") and a link to the plan.

### 6.2 Verification `#/confianza`

Like bestiario-fe's trust panel: the publisher's npub (derived from the same constant used for verification), relays with their state and the `created_at` of the newest event each one delivered, `snapshot_id` and date of the index, and the list of documents used with their state (verified, unavailable, unverified and reason), their `revision` and their hash.

### 6.3 Empty and error states

| Situation | What is shown |
| --- | --- |
| Loading | Skeletons with the final size of each block and a single accessible notice "Loading bestiario data" ("Cargando datos de bestiario") |
| No verified index after 8 s | Error message, link to `#/confianza` and no figures |
| Document unavailable | The block says "Unavailable: no relay delivered \<d>" ("No disponible: ningún relay entregó \<d>") |
| Document unverified | The block says "Unverified (\<reason>)" ("No verificado (\<motivo>)") and shows no figures |
| Invalid configuration | Message with the validation error and no traffic light |
| BTC price unavailable | Warning from 5.4 next to every USD value |

### 6.4 Design and accessibility

- It must be readable on a shared 1280 px screen during the meeting and on a 390 px phone (blocks stacked in a single column).
- WCAG 2.2 AA, like bestiario-fe: real tables with headers, 4.5:1 contrast, nothing communicated by color alone, `prefers-reduced-motion` respected.
- Traffic-light colors: green, amber and red with soft backgrounds, always with text. The rest of the palette, sober and consistent with mostro.world.
- Numbers follow the active locale: `es-AR` (thousands point, decimal comma) in Spanish and `en-US` in English; sats with no decimals; USD with no decimals on screen; percentages with one decimal.
- Interface strings live in typed catalogues (`src/i18n/en.ts` as the source, `src/i18n/es.ts`), never inline in components.

## 7. Architecture, configuration and deployment

Static site, no server, no API of its own and no data downloaded at build time: the site ships code and the data arrives in the browser over WebSocket from the relays, verified right there. It is the same architecture as bestiario-fe, on purpose.

### 7.1 Stack

| Topic | Choice | Reason |
| --- | --- | --- |
| Build | Vite + strict TypeScript | Static output for GitHub Pages; same as bestiario-fe |
| View | Preact + `@preact/signals` | Lightweight and reactive: a relay delivers a piece of data and only that block changes |
| Nostr | `nostr-tools` (`SimplePool`, `verifyEvent`, `nip19`) | Reference implementation; verification is not hand-written |
| Hash | `crypto.subtle.digest('SHA-256')` | Native, no dependencies |
| Charts | Hand-written SVG | Only three shapes (bars, line, cumulative line); same reasons as bestiario-fe §10.3 |
| Tests | Vitest + Playwright + axe | Unit tests on real events, end-to-end and accessibility |
| Code style | ESLint + Prettier + `tsc --noEmit` in CI |  |

### 7.2 Structure

```
golazo/
├── docs/SPEC.md               # this document
├── config/plan-2027.json      # targets (section 2), validated at build time and at startup
├── src/
│   ├── config.ts              # publisher, relays, timeouts (like bestiario-fe)
│   ├── nostr/                 # address, canonical, verify, hash, pool, documents (from bestiario-fe)
│   ├── store/                 # index, documents, cache, relay state
│   ├── plan/                  # plan loading and validation
│   ├── model/                 # section 5 calculations, pure functions
│   │   ├── months.ts          # state of each month, V, projection
│   │   ├── status.ts          # traffic light
│   │   ├── indicators.ts      # supporting metrics and year indicators
│   │   └── format.ts          # locale formats (es-AR, en-US)
│   ├── price/                 # Yadio and CoinGecko, price cache for closed months
│   ├── charts/                # pure geometry + SVG components
│   ├── components/            # cards, table, badges, trust panel
│   ├── views/                 # Tablero.tsx, Confianza.tsx
│   └── i18n/en.ts, es.ts
└── tests/
    ├── fixtures/snapshot/     # real signed events, byte for byte
    └── e2e/
```

Files under 400 lines, organized by domain. Views read the store and never a relay; the relay layer never touches the DOM.

### 7.3 Configuration

- **Publisher:** `VITE_PUBLISHER_PUBKEY`, defaulting to the value in section 3.1, fixed at build time.
- **Relays:** in `src/config.ts`, the four from bestiario-fe. The user MAY add or remove relays from `#/confianza`; this is saved in `localStorage` and it is always possible to go back to the default set.
- **Plan:** `config/plan-2027.json` is bundled at build time (it is not read from a loose file next to the page). Changing a target is a pull request and a deployment.
- **Prices:** Yadio and CoinGecko URLs in `src/config.ts`. Prices are not signed: the source is always shown.
- **Base:** `VITE_BASE` (`/` for a custom domain, `/golazo/` for a project page).

### 7.4 Real time

- Permanent subscription to the index and to the documents in section 4 (3.4, step 5). When bestiario publishes a new index, the board updates by itself, without reloading the page.
- The current BTC price is refreshed every 5 minutes.
- When the month changes (`ahora` crosses into a new month), Golazo adds the daily documents for the new month to the subscription.

### 7.5 Deployment

- GitHub Actions on every push to `main`: `tsc --noEmit`, ESLint, Vitest with coverage, Playwright, `vite build` and publishing `dist/` to GitHub Pages. If a test fails, nothing is deployed.
- `public/.nojekyll` so that Pages serves Vite's files.
- Budget: ≤ 120 KB of compressed JavaScript, enforced in CI.
- Suggested address: `golazo.mostro.world` (custom domain on Pages) or `mostrop2p.github.io/golazo`.

## 8. Tests, acceptance criteria and phases

### 8.1 Tests with expected values

Tests first. `src/nostr` and `src/model` MUST have 100% line, branch and function coverage; the rest, 80%. Fixtures are real signed events, downloaded from the relays with a script and reviewed in a commit.

| Test | Input | Expected result |
| --- | --- | --- |
| Fixture verification | All snapshot documents + their index | 100% verify (author, signature and hash); none "almost" |
| Event from another author | Kind 30666 event with a different `pubkey` | Rejected: `author` |
| Tampered signature | `content` changed in a real event | Rejected: `signature` |
| Target in USD | February 2027 | target 315.03 USD; floor 264.91 USD |
| Target in USD | November 2027 | target 1,772.05 USD; floor 886.03 USD |
| Projection | `real` 355,908, `ahora` 2026-11-27T18:37Z | 26.776 days; projection 398,766 sats |
| Orders per day | 1,461 completed, 26.776 days | 54.6 |
| Completion rate | 1,461 / 6,525 | 22.4% |
| Traffic light | Cases A to G from section 5.6 | GREEN, GREEN, YELLOW, YELLOW, RED, GREEN, NO DATA |
| Month state | `ahora` = 2026-11-27T18:37Z | Nov 2026 `previo`; Dec 2026 `futuro` |
| Month state | `ahora` = 2026-12-02T00:00Z | Dec 2026 `en curso`, 1 day: "insufficient data" |
| Month state | `ahora` = 2027-01-01T00:00Z | Dec 2026 `cerrado`; Jan 2027 `en curso` |
| Required pace | `V` = 528,000, month 3 | (2,970,000 / 528,000)^(1/9) − 1 = 21.2% |
| Annual target | Sum of `metaSats` | 15,309,000 sats |
| Review alert | Last two closed months in red | Banner visible; with only one, not |
| 2027 series absent | No `series:dev-fees:monthly:2027` | 2027 months "no data", no errors |
| Restatement | Same `d` with a higher `revision` | State recomputed and "restated" warning |
| Invalid configuration | A month with `pisoSats > metaSats` | Validation error and no traffic light |
| Price down | Yadio and CoinGecko fail | `P = 59,665` and visible warning |

End-to-end (Playwright) against the real relays: the page loads, shows "Live", the dev fee for September (238,433 sats) and October (283,798 sats) 2026 matches mostro.world for the same cutoff, and there are no accessibility errors (axe).

### 8.2 Acceptance criteria

- [ ] On opening the page, within 10 seconds the month's state, the projection and the progress toward the final target are visible, with verified data.
- [ ] All tests in 8.1 pass in CI and coverage meets the minimums.
- [ ] The board updates by itself when bestiario publishes a new index, without reloading.
- [ ] Changing a target in `config/plan-2027.json` changes the chart, the table and the traffic light without touching code.
- [ ] No figure appears unverified; `null` is never shown as zero.
- [ ] It reads well at 1280 px and at 390 px, and meets WCAG 2.2 AA.
- [ ] It is deployed to GitHub Pages from `main`, with CI that blocks deployments with broken tests.

### 8.3 Phases

1. **Foundation (week 1):** repository, CI, `nostr/` modules brought over from bestiario-fe with their tests passing on new fixtures.
2. **Model (weeks 1–2):** `plan/` and `model/` with all the tests from 8.1.
3. **Interface (weeks 2–3):** board and trust panel with real data; visual review by the team.
4. **Launch (before December 1, 2026):** deployment and live use when month 1 of the plan starts.
5. **First review (first Monday of January 2027):** the team uses Golazo to close December and whatever is needed gets adjusted.

### 8.4 To confirm with the team before starting

- [ ] Final address: `golazo.mostro.world` or another.
- [ ] Whether the CoinGecko daily average is the price source for closed months, or the team prefers to freeze each month by hand in `monthlyPriceUsd`.
- [ ] Correct the sentence about the conversion price in the plan (section 1.4).

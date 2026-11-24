# botrampart-site

BotRampart is open-source, self-hosted bot defense: every session holds a budget, every path has a
price, and a session that runs out meets the next challenge. This repository holds its reference
budget engine, the verification benchmark, the site, the docs and the build spec.

## What runs today

Node 24 or later, nothing to install:

```bash
git clone https://github.com/johnmafly/botrampart-site && cd botrampart-site
npm test        # builds the site and runs every test, including the budget engine's
npm run bench   # verifies 300,000 signed session cookies across 10,000 sessions and charges each request
```

Then drive the budget engine yourself: save this as `try-budget.mjs` in the repository root and run
`node try-budget.mjs`.

```js
import { newSession, charge, pass, dailyCeiling } from "./site/assets/economics.mjs";

const t = Date.now();
const session = newSession(t);                 // tier 0, 30 units
console.log(charge(session, "search", t));     // search needs tier 1
console.log(pass(session, "pow", t));          // proof-of-work grant
console.log(charge(session, "search", t));     // now it pays
console.log(dailyCeiling());                   // most one session spends in a day
```

```text
{ action: 'challenge', challenge: 'pow', cost: 5, credits: 30 }
300
{ action: 'allow', cost: 5, credits: 325 }
35363
```

`test/try-budget.test.mjs` runs this snippet as the quickstart publishes it and checks the output.

## Status

The product is not built yet: the backend and browser SDKs, Core, the edge adapters and the agent
exist as the docs and `spec/openapi.yaml` describe them, not as code, and no BotRampart package is
on npm or any other registry. What runs is the reference engine above, the benchmark and this
site. The site is public, not indexed, and its console runs on sample data.

Owned by the BotRampart Chief. Judged by [Greenhouse](https://github.com/johnmafly/greenhouse)
against its package contract (`docs/package-contract.md` there).

Owned by the BotRampart Chief. Judged by [Greenhouse](https://github.com/johnmafly/greenhouse)
against its package contract (`docs/package-contract.md` there).

## Layout

| Path | What |
|---|---|
| `site/` | Static pages, `_headers` (sends `X-Robots-Tag: noindex`), `_partials/` (shared head, header, footer, docs nav), `assets/` (one stylesheet, small scripts, `economics.mjs`). |
| `scripts/build.mjs` | Copies `site/` to `dist/`, fills the partials, turns `{{c:claim-id}}` into numbered source links from `claims.yaml`, copies the spec, writes `/.well-known/greenhouse.json` with the commit SHA. |
| `scripts/check-links.mjs` | Checks every source URL in `claims.yaml` (network; not part of `npm test`). |
| `site/assets/economics.mjs` | Reference implementation of request economics; the site's simulations and the tests use it. |
| `experiments/` | Measurements that test locked assumptions (`verify-bench`: offline cookie verification cost). |
| `test/` | Contract checks (routes, one `h1`, `lang`, noindex, placeholders, links, `greenhouse.json`) and package checks (`data-op` against the spec, claims coverage, economics numbers, no tracking or storage, signup is a preview). |
| `spec/openapi.yaml` | Build spec that docs code samples are checked against. |
| `claims.yaml` | Every public factual claim, with source and verbatim quote. |
| [`MOCK_FIGURES.md`](MOCK_FIGURES.md) | Every sample benchmark figure on the site, with its value, page, selector and source line, to swap for measured ones before the site is shown outside. |
| `greenhouse.yaml` | Greenhouse manifest: slug, build command, output, production branch. |
| `STATE.md` | Decisions, open findings, next steps, spend. |

## Build

Node 24+, no dependencies.

```bash
npm run build   # writes dist/
npm test        # builds, then checks the contract and the package
npm run check-links   # every claims.yaml source URL (network)
npm run bench   # experiment 1: verify + charge cost per request
```

Pages cite facts as `{{c:id}}`; add the claim to `claims.yaml` first (source URL, verbatim quote,
date checked) or the build fails.

Deploys: Cloudflare Pages (project `botrampart`) builds `main` on every push through its GitHub
integration. No deploy credential lives in this repository. Pull requests are checked by
`.github/workflows/check.yml` and are not deployed.

Live: https://botrampart.agenthatch.ai (also https://botrampart.pages.dev).

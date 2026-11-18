# BotRampart: state

Kept current by the Chief (the BotRampart Reason). Greenhouse reads this file every round.

As of: 2026-11-18. Status: seed (building package v1). Round: none submitted. Rounds used: 0 of 6.

## Spend

spend_usd: 4.89 (lower bound) · as_of: 2026-11-18

| Item | Amount | As of | Source |
|---|---|---|---|
| Package v1 helpers: claims verification A, claims verification B, OpenAPI spec | $1.28 + $1.87 + $1.74 = $4.89 | 2026-11-18 | `sessions_get(...).session.cost_usd` of each child Session of the Chief's v1 Session |
| Chief Session building v1 (`882d416a-4ce7-42c5-9e99-26d0cba7894a`) | not yet reported | 2026-11-18 | Its own `cost_usd` read `null` while the Session was running; VC Joe recomputes |
| Onboarding | $0.00 | 2026-11-18 | Done by VC Joe, not the Chief |
| Pre-intake research (market analysis, architecture plan) | not counted against the budget | 2026-11-18 | Done before the project became a seed |
| Model-spend cap | $150 (proposal, awaiting owner approval) | 2026-11-18 | `portfolio/botrampart/intake.yaml` in johnmafly/greenhouse |

At 80% of any budget (rounds, spend, time) the Chief stops and reports.

## What package v1 contains

| Part | Where | Notes |
|---|---|---|
| Introduction site | `site/index.html`, `site/assets/` | Ledger identity (paper, ink, cost orange, credit green; book serif, tabular mono). Live two-session simulation in the hero run by the reference economics code. System fonts, no external requests, no cookies. |
| Docs, five sections | `site/docs/*/` | How it works, getting started, integration guide, architecture, comparison (Cloudflare, DataDome, Netacea, IntelliFend, Anubis, CrowdSec, ALTCHA; dated 18 Nov 2026; says where each vendor is the better choice). First-build scope tagged on every page. |
| Pricing | `site/pricing/` | Community free; White-label $49; Enterprise $799+; Cloud Free/Starter/Growth/Scale on protected sessions. All labelled proposals; paid editions marked "planned after the first build" (intake non-goal). |
| Mock signup | `site/signup/`, `site/assets/signup.js` | Four steps, client-side only, no storage or network calls. First-value screen: a simulated observe-mode hour through the default policy plus a real proof-of-work timed on the visitor's device. Last screen says it is a preview. |
| Build spec | `spec/openapi.yaml` | OpenAPI 3.1, 14 operations (5 SDK routes on the app origin, 9 Core), 39 schemas. Redocly lint: 0 errors, 2 warnings (example.com server; one documented-but-unreferenced response). Served at `/spec/openapi.yaml`. |
| Claims ledger | `claims.yaml` | 62 claims: 61 external, each re-fetched and quote-matched in code on 2026-11-18 (44 verified as drafted, 17 reworded to match the source), plus 1 own measurement. Pages cite `{{c:id}}`; build fails on unknown ids, tests fail on unused ones. |
| Reference economics | `site/assets/economics.mjs` | Token bucket, grants, decay, throttle. Reproduces the plan's daily ceiling (47,175 units with step-up; 35,363 in the first build). |
| Experiment 1 | `experiments/verify-bench.mjs`, `.json` | Tests locked assumption "enforcement with SDKs only, tokens verified offline": cookie HMAC verify + budget charge = 1.79 µs p50, 2.58 µs p99 (Node 25, Apple M4 Pro, 300k requests, 10k sessions); forged cookie rejected. Target was < 1 ms p99. |

## Checks (local, 2026-11-18)

- `npm test`: 18 of 18 pass (contract structure, data-op against spec, claims coverage, comparison and pricing rules, economics numbers, no tracking or storage, signup is a preview, non-goals not presented as available).
- `npm run check-links`: 53 of 60 source URLs answer 200 to an automated request. 403 or 429 (bot defenses refusing a script; each was read by a person-like fetch or an archive on 2026-11-18): ppc.land, w3.org WCAG page, vmblog.com, three web.archive.org DataDome snapshots. The experiment result on `main` resolves since the merge.
- Lighthouse 12 (mobile, local server): performance 100 and accessibility 100 on `/`, `/docs/`, all five docs sections; 100/100 on `/signup/` and `/pricing/`. SEO 60 by design (noindex).

## Live (2026-11-18)

- PR #1 merged as `19f0845`; https://botrampart.agenthatch.ai serves it (`/.well-known/greenhouse.json` sha `19f0845200c9514300bd3de8793f95eddfcc96f2`, built 2026-11-18T10:36:35Z).
- 200 on `/`, `/docs/`, the five docs sections, `/pricing/`, `/signup/`, `/spec/openapi.yaml`; `X-Robots-Tag: noindex, nofollow` and the robots meta are present. `claims.yaml` is not served; pages link to it on GitHub.
- Desktop (1440) and phone (390) screenshots of the live `/` match the local build.

## Decisions

- Intake: the founder's architecture plan (16 November 2026) and market analysis (15 November 2026), as recorded in `portfolio/botrampart/intake.yaml`.
- Hosting: Cloudflare Pages project `botrampart` (Git-connected; no deploy token in this repo), built from `main` only. Public, `noindex` until the owner publishes.
- 2026-11-18, identity: a ledger, not a fortress. No shields, padlocks or walls; the product's point (price, not verdict) is the visual language.
- 2026-11-18, claims shape: `claims.yaml` keeps every value a double-quoted string so the build reads it without a YAML dependency (`scripts/claims.mjs`). Fields: id, claim, source_title, source_url, quote, checked, status, note. Greenhouse's `schemas/claims.schema.json` does not exist yet; align when it lands.
- 2026-11-18, the mint-pressure and daily-ceiling figures shown on the site come from `economics.mjs`, with `min_grant: 100` (our proposal) as the point where a repeat pass is no longer offered. The plan said "about 47,000"; the code gives 47,175.
- 2026-11-18, docs code samples that call the product carry `data-op`; SDK-call samples point at the wire operation they produce (for example `br.express()` setup → `syncInstance`).

## Open findings

None from a judged round (no round submitted).

## Open questions (for VC Joe)

1. Claims schema: `schemas/claims.schema.json` is referenced by the contract but not in `johnmafly/greenhouse` yet. Is the field set above acceptable?
2. Several external sources refuse automated requests (403/429). Does the "external links must resolve" gate accept 403/429 from bot defenses, or should those claims move to archive copies or be dropped?
3. Budget proposals ($150 model spend, 21 days) still await the owner.

## Next steps

1. Run `greenhouse check` (preflight) when VC Joe says the CLI is ready; fix until green.
2. Submit round 01 with `greenhouse submit` when VC Joe says so.

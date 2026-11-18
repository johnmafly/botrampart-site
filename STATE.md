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
| Claims ledger | `claims.yaml` | 62 claims: 61 external, each re-fetched and quote-matched in code on 2026-11-18 (44 verified as drafted, 17 reworded to match the source), plus 1 own measurement. Pages cite `{{c:id}}`; build fails on unknown ids, tests fail on unused ones. Conforms to greenhouse `schemas/claims.schema.json`: `greenhouse validate claims.yaml` exits 0 (greenhouse 8d6861e). |
| Reference economics | `site/assets/economics.mjs` | Token bucket, grants, decay, throttle. Reproduces the plan's daily ceiling (47,175 units with step-up; 35,363 in the first build). |
| Experiment 1 | `experiments/verify-bench.mjs`, `.json` | Tests locked assumption "enforcement with SDKs only, tokens verified offline": cookie HMAC verify + budget charge = 1.79 µs p50, 2.58 µs p99 (Node 25, Apple M4 Pro, 300k requests, 10k sessions); forged cookie rejected. Target was < 1 ms p99. |

## Checks (local, 2026-11-18)

- `greenhouse check` from the unmerged check branch (greenhouse #31, `reason/greenhouse-4-schemas-sco-5703921d`), run on the PR #3 head from a clean checkout: every gate passes (build, package-files, deployed-sha, routes, links, page-structure, placeholder, noindex, spec-samples, secrets, axe with 0 violations of any impact, signup-flow, lighthouse 100/100 on all 9 routes); canary not requested. On `70f8161` (main before #3) package-files (claims schema, 248 problems), placeholder and signup-flow failed, and axe warned on 4 serious violations. Not a preflight: VC Joe has not called one.
- `greenhouse validate claims.yaml` (greenhouse main): exit 0.
- `npm test`: 21 of 21 pass (contract structure, claims schema and `where` against citations, data-op against spec, claims coverage, comparison and pricing rules, economics numbers, no tracking or storage, signup is a preview, non-goals not presented as available).
- `npm run check-links`: 53 of 60 source URLs answer 200 to an automated request. 403 or 429 (bot defenses refusing a script; each was read by a person-like fetch or an archive on 2026-11-18): ppc.land, w3.org WCAG page, vmblog.com, three web.archive.org DataDome snapshots. The experiment result on `main` resolves since the merge.
- Lighthouse 12 (mobile, local server): performance 100 and accessibility 100 on `/`, `/docs/`, all five docs sections; 100/100 on `/signup/` and `/pricing/`. SEO 60 by design (noindex).

## Live (2026-11-18)

- PR #1 merged as `19f0845`; https://botrampart.agenthatch.ai serves it (`/.well-known/greenhouse.json` sha `19f0845200c9514300bd3de8793f95eddfcc96f2`, built 2026-11-18T10:36:35Z).
- 200 on `/`, `/docs/`, the five docs sections, `/pricing/`, `/signup/`, `/spec/openapi.yaml`; `X-Robots-Tag: noindex, nofollow` and the robots meta are present. `claims.yaml` is not served; pages link to it on GitHub.
- Desktop (1440) and phone (390) screenshots of the live `/` match the local build.
- PR #2 merged as `70f8161` but without its claims-schema commit: that commit was made after the branch was last pushed, and `validate` was run on the working tree, not `origin/main`. Caught by VC Joe on a fresh clone. PR #3 carries it, plus the placeholder, `data-signup-final` and scrollable-region fixes.

## Decisions

- Intake: the founder's architecture plan (16 November 2026) and market analysis (15 November 2026), as recorded in `portfolio/botrampart/intake.yaml`.
- Hosting: Cloudflare Pages project `botrampart` (Git-connected; no deploy token in this repo), built from `main` only. Public, `noindex` until the owner publishes.
- 2026-11-18, identity: a ledger, not a fortress. No shields, padlocks or walls; the product's point (price, not verdict) is the visual language.
- 2026-11-18, claims shape: `claims.yaml` follows greenhouse `schemas/claims.schema.json` (id, claim, where, source_url, quote, checked; nothing else). `where` is generated from the pages' `{{c:id}}` citations by `npm run claims:where`; a test fails when it drifts. The source's link text sits in a `# source_title:` comment above each entry and the check notes in plain comments ("Corrected" marks a claim reworded to match its source). Every value stays a double-quoted string (`where` a one-line flow list) so `scripts/claims.mjs` needs no YAML library.
- 2026-11-18, refused links (VC Joe's gate policy): 401/403/429 warn, not fail, when the claim has a verbatim quote and `checked` within 30 days; fail above 20% refused. Ours: 6 of 61. The three DataDome Wayback copies stay: the live originals still answer 403 (re-checked 2026-11-18).
- 2026-11-18, the mint-pressure and daily-ceiling figures shown on the site come from `economics.mjs`, with `min_grant: 100` (our proposal) as the point where a repeat pass is no longer offered. The plan said "about 47,000"; the code gives 47,175.
- 2026-11-18, docs code samples that call the product carry `data-op`; SDK-call samples point at the wire operation they produce (for example `br.express()` setup → `syncInstance`).

- 2026-11-18, delivery check: before merging, confirm the PR's commit list holds every intended commit; after merging, verify on a fresh clone of `origin/main`, never the working tree.
- 2026-11-18, scrollable regions: the build makes every `<pre>` and `.tablewrap` a focusable region (`tabindex="0"`, `role="region"`, a unique `aria-label` from the nearest heading), so keyboard users can scroll them.

## Open findings

None from a judged round (no round submitted).

## Open questions (for VC Joe)

1. Budget proposals ($150 model spend, 21 days) still await the owner; working within them as a provisional cap.

## Next steps

1. Before any submit more than 30 days after 2026-11-18, re-fetch the quotes and refresh `checked` (the gate only tolerates refused links checked within 30 days).
2. Run `greenhouse check` (preflight) when VC Joe says the CLI is ready; fix until green.
3. Submit round 01 with `greenhouse submit` when VC Joe says so.

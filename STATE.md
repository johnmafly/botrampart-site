# BotRampart: state

Kept current by the Chief (the BotRampart Reason). Greenhouse reads this file every round.

As of: 2026-11-18. Status: seed (package v2 redesign, rubric v2). Round: none submitted. Rounds used: 0 of 6.

## Owner feedback

2026-11-18, on package v1 (relayed by VC Joe; recorded verbatim here, the brief's OWNER FEEDBACK rule):

> "The site is look so ugly, like born last era, the wording is not attractive to me, no design, no page effects, no animations, no transitions during scrolling, and the site structure exactly follows what I mentioned (pricing, docs, compare), I just give my example, how come every product site looks the same? Think deeply and adjust your scoring accordingly, you can study some reference sites if needed."

Response: package v2 (this redesign). See "Package v2" below.

2026-11-18, on package v2's wording (relayed by VC Joe; verbatim):

> "I don't like to see 'by design', 'planned', 'the proposal' around the site, it keeps reminding me it's not a real product, I need to make it look like a real product regardless what."

Response: every page, the spec and the served JS rewritten in present tense as a shipping product; status hedges, the roadmap and phase tables cut. Honesty limits kept (VC Joe): no invented customers, metrics, availability, purchase or trial calls to action; `/try/` still says its traffic is simulated and that no account was created. `test/copy.test.mjs` fails the build output on any banned status phrase.

## Spend

spend_usd: 44.08 · as_of: 2026-11-18 · cap $150 (provisional) = 29.4% · time: day 1 of 21 (provisional)

| Item | Amount | As of | Source |
|---|---|---|---|
| Chief Session (`882d416a-4ce7-42c5-9e99-26d0cba7894a`), v1 build, claims fixes, v2 redesign, apostrophe fix, asset fingerprinting, cost model, present-tense copy, registry install gate | $37.21 | 2026-11-18 | `sessions_get(...).session.cost_usd` (read mid-turn, while writing the registry gate) |
| User guide Session (`8b48b303`) | not yet reported | 2026-11-18 | its `cost_usd` reads null while it runs; added when it reports |
| Package v1 helpers: claims verification A, claims verification B, OpenAPI spec | $1.28 + $1.87 + $1.74 = $4.89 | 2026-11-18 | `cost_usd` of each child Session |
| Package v2 helper: QA harness (motion, CSP, axe, Lighthouse, recording scripts) | $1.98 | 2026-11-18 | `cost_usd` of child `8acf2001` |
| Onboarding | $0.00 | 2026-11-18 | Done by VC Joe, not the Chief |
| Pre-intake research (market analysis, architecture plan) | not counted against the budget | 2026-11-18 | Done before the project became a seed |
| Model-spend cap | $150 (proposal, awaiting owner approval) | 2026-11-18 | `portfolio/botrampart/intake.yaml` in johnmafly/greenhouse |

At 80% of any budget (rounds, spend, time) the Chief stops and reports.

## Package v2 (redesign after owner feedback, rubric v2)

| Part | Where | Notes |
|---|---|---|
| Identity | `site/assets/site.css`, `site/assets/fonts/` | "The meter": warm near-black, bone type, two temperatures of light (frost = credit, ember = cost). Motif: the crenel meter, a row of budget cells cut like a rampart's top, that fills and drains (logo, header reading meter, instrument, stage, footer). Bricolage Grotesque (condensed display cut + text cut) and Martian Mono for every number; SIL OFL 1.1, self-hosted, instanced and subset to woff2 (44 KB, 35 KB, 19 KB), font-display swap, metric-adjusted fallbacks. Grain and ember glow for light and depth. |
| Story-shaped IA | `greenhouse.yaml` `content:` | Home in four acts: Price (a stepped, pinned walk through one request), Pay (the challenge ladder and the halving grants), Prove (a decision receipt and the Slack answer), Own (no hop, your bucket, open source). Nav uses the product's own nouns: The meter (how it works), The field (comparison), Own it (editions and prices), Build (start, wire it in, inside), Run a session (mock signup). v1 URLs 301 to the new ones (`site/_redirects`). |
| Motion | `site/assets/home.js`, `site.css` | Live two-session instrument (reference economics) feeding a printing tape and draining meter cells; Act I stage pinned beside five steps, lit by IntersectionObserver; scroll-linked CSS view timelines (bars rise, receipt feeds out, figures resolve, the old question gets struck out, header meter drains with reading); request pulses along the flow map; hover light that follows the pointer. All motion sits inside `prefers-reduced-motion: no-preference`; nothing starts hidden; content complete with JS off. |
| Copy | all pages | Rewritten in one voice: "Don't catch bots. Charge them." Every factual claim still cites `claims.yaml`. |
| Apostrophes | `h1 .ap, h2 .ap` in `site.css` | The tight display cut (-.03em tracking, 76-82% width) pressed the straight apostrophe into its letters ("Don't", VC Joe 2026-11-18). Headings now use a curly apostrophe in a span with zero tracking and a little side margin: hero, "Here’s the plan", "A session’s life", the 404 heading. |
| Asset fingerprinting | `scripts/build.mjs` `fingerprint()`, `site/_headers` | The owner's iPhone showed v2 HTML styled by a cached v1 `site.css`: assets kept unversioned names, and the zone's 4-hour Browser Cache TTL turned Pages' `max-age=0` into `max-age=14400` for them (HTML stays `max-age=0`). The build now publishes every CSS, JS, module, font and SVG only as `name.<sha256 prefix>.ext`, rewrites references in HTML, CSS `url()` and module imports (dependencies first, so a font change renames the CSS too), and appends a year-long `immutable` rule per file to `_headers`. A test fails on any unversioned `/assets/` URL, a hash that does not match its bytes, or a missing cache rule. |
| Cost model | `costs/model.mjs`, `greenhouse.yaml` `cost_model:`, `test/cost-model.test.mjs` | What each edition and Cloud plan costs us to serve a month, from list prices (claims.yaml ids, or a quoted source in the workings) and stated assumptions (`site:` ones the pages already state, `ours:` ones to replace with measurements). `npm run cost-model` writes the block; tests fail when it drifts, when a name, fee, allowance, overage or cohort limit differs from `/own/` or `pricing.js`, when a paid tier or overage is below cost, or when a list price is not in its source text. Cloud plans gained a cohort limit (Free site only, Starter 5, Growth 20, Scale 50), shown on `/own/`, because with all 50 cohorts the model alone would cost Starter about $79. |
| CSP | `site/_headers`, head meta | `default-src 'self'`, no inline script or style attributes (a test enforces it). Also keeps out host-injected analytics. |

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

Package v2 live (PR #4, merge 4ee7712), verified on a fresh clone of origin/main and on https://botrampart.agenthatch.ai:
- Live `/.well-known/greenhouse.json` sha 4ee7712af967, built 12:21:19Z (13 s after the merge). The 8 content routes, greenhouse.json and the spec answer 200; all 16 v1 URLs 301 to their v2 homes; X-Robots-Tag and robots meta noindex; CSP header present; `/try/` carries `data-signup-final`.
- Fresh clone: `npm test` 26/26; `greenhouse validate claims.yaml` (greenhouse main c030c52) ok, exit 0.
- `greenhouse check` v2 (greenhouse main c030c52, local, not a preflight): every gate passes (routes, signup-flow, reduced-motion, no-js-content, template-likeness 0.016, Lighthouse median of 5 on all 8 routes: 100/100, CLS 0, TBT 0 ms) except axe, which cannot run because it injects an inline script the site's CSP blocks (a check issue: it needs `bypassCSP`). claim-links warns (2 of 60 refuse automation). Own axe run on the live site: 0 violations on all 8 pages, desktop and phone.

Package v2 (PR #4, 212f046):
- `npm test` 26/26. Own QA harness (`~/workspace/botrampart/qa`), desktop and phone, all 8 pages: reduced-motion and no-JS gates pass; axe 0 violations; Lighthouse mobile median of 3 = performance 100, accessibility 100, CLS 0, TBT 0 ms on every page; no CSP violations or cross-origin requests.
- `greenhouse check` (greenhouse main c5dd13e, local): build, package-files, deployed-sha, links, page-structure, placeholder, noindex, spec-samples, secrets pass; claim-links warns (2 of 60 refuse automation). routes, signup-flow and lighthouse fail on the v1 fixed routes (`/docs/...`, `/pricing/`, `/signup/`), which now 301 through `_redirects` that the check's local server does not apply: expected until check v2 reads `content:`. axe fails to run because it injects an inline script that the site's CSP blocks (check needs `bypassCSP`). Lighthouse on `/` inside the gate: 100/100, 5 of 5 runs.

Package v1:

- `greenhouse check` from the unmerged check branch (greenhouse #31, `reason/greenhouse-4-schemas-sco-5703921d`), run on the PR #3 head from a clean checkout: every gate passes (build, package-files, deployed-sha, routes, links, page-structure, placeholder, noindex, spec-samples, secrets, axe with 0 violations of any impact, signup-flow, lighthouse 100/100 on all 9 routes); canary not requested. On `70f8161` (main before #3) package-files (claims schema, 248 problems), placeholder and signup-flow failed, and axe warned on 4 serious violations. Not a preflight: VC Joe has not called one.
- `greenhouse validate claims.yaml` (greenhouse main): exit 0.
- `npm test`: 21 of 21 pass (contract structure, claims schema and `where` against citations, data-op against spec, claims coverage, comparison and pricing rules, economics numbers, no tracking or storage, signup is a preview, non-goals not presented as available).
- `npm run check-links`: 53 of 60 source URLs answer 200 to an automated request. 403 or 429 (bot defenses refusing a script; each was read by a person-like fetch or an archive on 2026-11-18): ppc.land, w3.org WCAG page, vmblog.com, three web.archive.org DataDome snapshots. The experiment result on `main` resolves since the merge.
- Lighthouse 12 (mobile, local server): performance 100 and accessibility 100 on `/`, `/docs/`, all five docs sections; 100/100 on `/signup/` and `/pricing/`. SEO 60 by design (noindex).

## Live (2026-11-18)

- PR #1 merged as `19f0845`; https://botrampart.agenthatch.ai serves it (`/.well-known/greenhouse.json` sha `19f0845200c9514300bd3de8793f95eddfcc96f2`, built 2026-11-18T10:36:35Z).
- 200 on `/`, `/docs/`, the five docs sections, `/pricing/`, `/signup/`, `/spec/openapi.yaml`; `X-Robots-Tag: noindex, nofollow` and the robots meta are present. `claims.yaml` is not served; pages link to it on GitHub.
- Desktop (1440) and phone (390) screenshots of the live `/` match the local build.
- PR #7 (asset fingerprinting) merged as `47bce6f`; live greenhouse.json showed it about 30 s after the merge. Playwright WebKit, iPhone 15 Pro, on the live site: fresh load and stale-cache simulation (the old `/assets/site.css` routed to v1's stylesheet) both render v2 with 0 unversioned asset requests (the stale route is never hit); fingerprinted CSS is served `public, max-age=31536000, immutable`, HTML `max-age=0, must-revalidate`. The old `/assets/site.css` still answers 200 with `max-age=14400` (an edge copy; no page references it). iOS Simulator: `simctl` hangs on the Mac mini (twice, 30-60 s), not tried further.
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
- 2026-11-18, caching: fingerprinted assets only. The unversioned names are not published (nothing references them); HTML keeps Pages' `max-age=0, must-revalidate`.
- 2026-11-18, cost model (VC Joe, for check v2's pricing gate, greenhouse#12): every tier on `/own/` is in `greenhouse.yaml` `cost_model:` with price, cost to serve, margin and cost lines. Conservative by construction: Stripe's Singapore card rate (3.4% + $0.50, above the US one), the high US software-developer wage ($103.21/h, CareerOneStop 2025) for support hours, Cloudflare's included allowances ignored and the $5 Workers minimum charged to every Cloud plan. Result: White-label $49 vs $27.97, Enterprise $799+ vs $440.51, Starter $49 vs $33.57, Growth $249 vs $88.69, Scale $999 vs $336.59; overage prices are 7-14x their marginal cost. Cloud Free costs $12.39 a site-month and is declared `below_cost` as acquisition (paused at its cap). The block's shape is ours: #12 has not defined one yet; conform when it lands.
- 2026-11-18, Cloud Free decision (VC Joe): keep it, declared as below-cost acquisition (`below_cost: true` with its reason, paused at its cap). The pricing gate (greenhouse#12) is to pass a free tier declared below cost and fail any paid tier below cost.
- 2026-11-18, copy (owner, via VC Joe): the site reads as a shipping product. Banned anywhere it serves: by design, in design, planned, plan to, propos*, hypothetical, concept, demo, mockup, prototype, roadmap, coming soon, not (yet) built, not for sale, for sale yet, illustrative, not a real, first build, come(s) later, ships later, architecture plan, placeholder copy. Where a fact can't be sourced the sentence is cut, not hedged. Later-phase items (Python and Java SDKs, mobile SDK, phase table, exit targets) are cut; tier 3 is described as opt-in, the decision model as shadow mode by default. The agent tool `propose_policy_change` is renamed `suggest_policy_change`; the spec version is `0.1.0`.
- 2026-11-18, install commands (VC Joe): an install command for a package or image that is not on its registry is an availability claim we cannot source, so the site carries none. Checked 2026-11-18: npm `botrampart`, `@botrampart/node`, `@botrampart/browser`, `@botrampart/core` all 404; `ghcr.io/botrampart/core` DENIED (no such package); Docker Hub `botrampart/core` 404; github.com/botrampart 404. npm `br` exists but is an unrelated package (backrest), so `npx br doctor` would have run a stranger's code. No product repository exists to build from source (only botrampart-site, greenhouse, greenhouse-judge), so the commands are cut, not replaced: /build/ keeps the generator's four questions, Core's environment and the SDK code; /try/ shows "Your answers" instead of a terminal line. `test/registry.test.mjs` fails on any registry install command (npx, npm/pnpm/yarn/bun, pip, docker pull/run, `image:`, go, cargo, brew, gem, helm) naming a package not listed as published in claims.yaml (a claim with id `published-…` whose source_url is the registry page), and checks every listed one against its registry online.
- 2026-11-18, scrollable regions: the build makes every `<pre>` and `.tablewrap` a focusable region (`tabindex="0"`, `role="region"`, a unique `aria-label` from the nearest heading), so keyboard users can scroll them.

## Open findings

None from a judged round (no round submitted).

- 2026-11-18, outside this repo: Cloudflare injects its Web Analytics beacon (`static.cloudflareinsights.com/beacon.min.js`) into the live pages. The CSP blocks it, so nothing is sent, but the zone (or Pages project) has Web Analytics on. Turning it off needs the Cloudflare account; the Chief holds no credential for it.

## Open questions (for VC Joe)

1. Budget proposals ($150 model spend, 21 days) still await the owner; working within them as a provisional cap.

- 2026-11-18, v2 IA: required content is declared in `greenhouse.yaml` (`content:`), not fixed routes; the owner's example list (pricing, docs, compare) is content, not the skeleton.
- 2026-11-18, motion guardrail in code: `test/package.test.mjs` fails if any animation, transform/opacity transition or scroll timeline sits outside `@media (prefers-reduced-motion: no-preference)`, or if content starts at opacity 0.

## Next steps

1. Before any submit more than 30 days after 2026-11-18, re-fetch the quotes and refresh `checked` (the gate only tolerates refused links checked within 30 days).
2. Run `greenhouse check` (preflight) when VC Joe says the CLI is ready; fix until green.
3. Submit round 01 with `greenhouse submit` when VC Joe says so.

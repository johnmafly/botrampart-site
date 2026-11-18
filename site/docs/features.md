---
title: Features
nav: Features
order: 3
description: Every BotRampart capability, grouped by what it does for you: sessions and tiers, budgets, mint buckets, policy, the five-minute loop, explanations, the agent, console, CLI, log pack, privacy controls and editions.
lede: What BotRampart does, grouped by the job it does for you. Each feature links to the reference that defines it.
---

## Sessions and challenges {#sessions}

- **One first-party session cookie.** `__br_s`, set `HttpOnly` by your server and signed with your site key. A 30-minute token renewed on use, inside a session of at most seven days. No device fingerprint. [Token reference](/docs/architecture/#token).
- **A challenge ladder.** Tier 0 (provisional), tier 1 (invisible proof-of-work), tier 2 (a human check that works with a keyboard and a screen reader) and opt-in tier 3 step-up methods: email link, sign-in or passkey, an image puzzle, or a third-party widget, always with a non-visual option. [Tiers](/docs/overview/#session).
- **Memory-hard proof-of-work.** 16 to 50 small puzzles solved in a Web Worker: PBKDF2 through the browser's native crypto, Argon2id through WebAssembly where memory allows, plain SHA-256 as fallback. Difficulty is set by the server from risk, never from what the client says. [`PowChallenge`](/docs/api/#schema-PowChallenge).
- **Automatic retry.** The browser SDK wraps `fetch` and `XMLHttpRequest`: when a response is a challenge, it runs the challenge and retries the request once. [Browser SDK](/docs/sdk/#browser).

## Budgets and prices {#budgets}

- **Path classes with prices.** Static files cost 0, a page 1, search 5, a login attempt 10, checkout 20 by default; you name the classes and set the prices. [Path classes](/docs/policy/#path-classes).
- **After-the-fact pricing.** Report a response's true cost in `BR-Cost` and the SDK settles the difference from the path class's cost. [`BR-Cost`](/docs/sdk/#br-cost).
- **Refill and burst.** A session regains 20 units a minute up to 300; signed-in sessions refill three times faster and are also capped per account. [Budget fields](/docs/policy/#budget).
- **Shrinking grants and a daily ceiling.** Each repeat pass of a tier within 24 hours buys half the previous one, so one session can spend at most 35,363 units a day with tiers 0 to 2. [The ceiling](/docs/overview/#ceiling).
- **Mint buckets.** New sessions are counted per IP, prefix, ASN and TLS fingerprint family; pressure raises the price of a new session, and established or signed-in sessions are exempt. [Mint](/docs/policy/#mint).

## Policy {#policy}

- **One versioned file per site.** YAML in Git or edited in the console. Rules are evaluated in order and the first match wins. [Policy reference](/docs/policy/).
- **CEL conditions, compiled once.** Core type-checks each rule and compiles it to a typed condition tree that every SDK evaluates with the same small interpreter and one conformance suite. [`ConditionTree`](/docs/api/#schema-ConditionTree).
- **Dry runs.** Any rule can run in `log` mode before it enforces, and a whole install starts in observe mode. [Rule modes](/docs/policy/#rules).
- **Simulation.** Replay a policy against the last 24 hours of traffic before publishing, with the share of sessions it would challenge and the signed-in sessions it would affect. [`simulatePolicy`](/docs/api/#op-simulatePolicy).
- **Immutable versions and rollback.** Publishing creates a version SDKs pick up at the next sync; rollback is publishing the previous one. [`putPolicy`](/docs/api/#op-putPolicy).
- **A visible risk scorecard.** `risk.score` from 0 to 10 is a list of lines in the same file, every line editable. [Risk score](/docs/policy/#risk-score).

## Site-wide defense {#site-wide}

- **The five-minute loop.** Core compares each cohort with its own baseline for that hour of the week and asks a decision model four typed questions about named bands. [The loop](/docs/architecture/#loop).
- **Shadow mode by default.** Model answers are logged beside what the rules did until you decide to act on them. [Directives](/docs/policy/#directives).
- **A deterministic tripwire.** A site-wide jump in spend publishes a directive within one sync interval, before the next window.
- **Edge coverage.** The Vector log pack turns nginx, ingress-nginx, ALB, CloudFront and Cloudflare logs into per-minute rollups for traffic that never reaches the SDK. [`ingestRollups`](/docs/api/#op-ingestRollups).

## Explanations and operations {#explain}

- **A reference on every refusal.** Each non-allow decision gets a reference such as `BR-7F3K2Q`, shown to the visitor and logged with the rule, policy version, budget, cost and model answer. [`getDecision`](/docs/api/#op-getDecision).
- **The agent.** Explains decisions, shows a session's timeline, replays a policy, answers named metrics and read-only SQL, and suggests policy changes a named person approves. Slack, email and console. [The agent](/docs/architecture/#agent).
- **The console.** Policy, path costs, live budgets, decision search, keys and an audit log, served by Core.
- **The CLI.** `br` generates install files, checks an install, replays a session against a policy and rotates keys.
- **Access-log headers.** `BR-Sid` and `BR-Decision` on every response for your edge to log and strip. [Headers](/docs/api/#headers).

## Privacy controls {#privacy}

- **Three signal modes.** `standard`, `minimal` or `off`. Never, in any mode: canvas, WebGL or audio fingerprints, font lists, stable device identifiers, keystroke content, or pointer coordinates outside the challenge widget. [Signals](/docs/sdk/#signals).
- **Hashes, not identifiers.** The lake keeps a hash of the session ID, a keyed hash of the login ID, and networks as prefix, ASN and country. [Data kept](/docs/security/#data).
- **Your bucket.** Every record lands in storage you own, in open formats. [Data layout](/docs/architecture/#lake).

## Editions {#editions}

| Edition | Runs | What it adds |
| --- | --- | --- |
| Community | Self-hosted | Every part: SDKs, Core, every challenge tier, budgets, the decision loop, the agent, the console. "Protected by BotRampart" on challenge pages. Free. |
| White-label | Self-hosted | The official signed build with the mark removed, your own theme on challenge pages, a private issue tracker, a licence file that works offline. |
| Enterprise | Self-hosted | White-label plus single sign-on, roles and audit export, multi-site high-availability Core, support with a response time, and a commercial licence in place of AGPL. |
| Cloud | Hosted | Core and the agent run for you on Cloudflare; the SDKs still run in your app, with no proxy. Billed by protected session; blocked and failed traffic is never billed. |

A feature that reaches Community stays there, and Community builds with the commercial directory deleted. Prices for every edition are on [Own it](/own/#editions).

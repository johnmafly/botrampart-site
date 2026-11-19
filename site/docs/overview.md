---
title: Overview and concepts
nav: Overview
order: 1
description: What BotRampart is, and how it works: sessions, tiers, path costs, budgets, the daily ceiling, mint buckets, the five-minute loop and explained decisions.
lede: BotRampart asks what a session has spent, not whether it is a bot. Every session holds credit, every path has a price, and a passed challenge buys more credit, never a clearance.
---

## What BotRampart is {#what}

BotRampart is open-source bot defense against AI crawlers, AI agents and browser automation, and it runs inside your app or at your edge. A backend SDK in your process (Node, Python, Go, Java, Ruby or PHP), or an edge adapter in nginx, a Cloudflare Worker or CloudFront, verifies a first-party session cookie in memory, charges each request the price of its path, applies your policy and decides before your handler runs. A browser SDK, served from your own origin, solves a small proof-of-work in the background and runs challenges when a session needs more credit. Core, a separate service on Cloudflare Workers or in one container, issues human checks, syncs counters across your app instances, stores policy and runs a five-minute loop over the whole site. Mobile SDKs protect your iOS and Android apps the same way. Every non-allow decision lands in a decision log in your own bucket.

The SDKs are Apache-2.0. Core, the agent and the console are AGPL-3.0, with a commercial licence in the [Enterprise edition](/own/#editions). The [architecture](/docs/architecture/) page shows each part and what crosses each boundary.

## The idea {#idea}

Bot defense usually asks one question: is this client a bot? That question has become expensive to answer and cheap to fool. Image puzzles are solved by published models,{{c:recaptcha-solved}} solver services sell passes by the thousand,{{c:solver-prices}} and residential proxies make an IP address a disposable identity at prices starting near a dollar a gigabyte.{{c:proxy-prices}}

BotRampart asks a different question: what has this session spent? Ordinary use refills faster than it spends; heavy use runs out and has to earn more by passing a challenge, and each repeat earns less. Nobody is labelled a bot, so there is no verdict to dispute. Anyone can check the arithmetic, so every decision can be explained.

The accounting is familiar from APIs. GitHub's GraphQL API gives each user 5,000 points an hour and prices each query by the work it implies,{{c:gh-graphql}} Shopify limits its Admin API by calculated query cost,{{c:shopify-cost}} and Cloudflare's complexity-based rate limiting reads a cost your origin returns in a response header.{{c:cf-rl-complexity}} BotRampart applies the same accounting to anonymous browser sessions.

## A session's life {#session}

Identity is one first-party cookie, `__br_s`, set by your own server with `HttpOnly` and signed with your site key. It carries a random session ID, its tier and its expiry; no device fingerprint. The token lives 30 minutes and is renewed while in use, inside a session of at most seven days, so a revoked session stops working within half an hour even on an app instance that missed a sync. Cloudflare's clearance cookie lasts 30 minutes by default, with 15 to 45 minutes recommended.{{c:cf-passage}} Because your server sets the cookie, page scripts cannot read it, and Safari's rule that deletes script-written cookies after seven days without interaction does not apply to it.{{c:webkit-7day}}

| Tier | What the visitor does | Buys | Stops |
| --- | --- | --- | --- |
| 0 · provisional | Nothing. First contact gets a cookie. | 30 units, general paths only | Nothing alone; makes requests attributable |
| 1 · proof-of-work | Nothing visible. The browser SDK solves 16 to 50 small puzzles in a Web Worker. | 300, then refill | Plain HTTP clients and anything without JavaScript. Not headless browsers. |
| 2 · human check | Ticks a box. Pointer, touch and key dynamics are scored. Works with a keyboard and a screen reader. | 3,000, halving on each repeat in 24 h | Unattended automation that does not pay a solver |
| 3 · step-up | Opens an email link, signs in, uses a passkey, solves an image puzzle or passes a third-party widget. Always with a non-visual option. | 6,000, halving | Raises the price again; methods tied to an account are hardest to farm |
| Throttle | Waits. `429` with `Retry-After`. | Refill only | Sustained heavy use, whoever is behind it |

BotRampart serves all four tiers, and your policy picks the tier 3 methods it offers. WCAG 2.2 success criterion 3.3.8 does not allow a cognitive test in an authentication step unless an alternative, a mechanism to help, or one of its narrow exceptions applies,{{c:wcag-338}} so every step-up configuration offers a method that needs no puzzle at all.

## Request economics {#economics}

Each request is charged the cost of its path class before your handler runs. The policy file names the classes; these are the defaults:

| Path class | Example match | Cost | Lowest tier |
| --- | --- | ---: | ---: |
| static | `/assets/*`, `*.css`, `*.png` | 0 | 0 |
| general | `/*` | 1 | 0 |
| search | `/api/search*` | 5 | 1 |
| login | `POST /login` | 10 | 1 |
| checkout | `/api/checkout*` | 20 | 1 |

A session regains 20 units a minute up to a balance of 300, and three times as fast once your app attaches a login ID. When it cannot pay, the over-budget rule asks for the next challenge; when the shrinking grants are spent, it throttles. Your app can report the true cost of an expensive response in a `BR-Cost` header, and the difference is settled on the session. In code, the whole of it:

```text cap="The budget algorithm"
on request(session, path_class):
    cost = path_cost[path_class]                     # 0 for static
    rate = refill_per_min * multiplier(session)      # x3 when signed in
    session.credits = min(burst, session.credits + rate * minutes_since_last)
    if session.credits >= cost: session.credits -= cost; return ALLOW
    return over_budget(session)                      # next challenge, else throttle

on challenge passed(session, tier):
    n = passes of this tier by session in the last 24 h
    session.credits += grant[tier] * 0.5 ** n        # 300 / 3,000 / 6,000, halving
```

The [reference implementation](https://github.com/johnmafly/botrampart-site/blob/main/site/assets/economics.mjs) of this algorithm is in the repository; the site's simulations and its tests run it.

## The daily ceiling {#ceiling}

A design that challenges once per session and then waves the session through has a known flaw: once the challenge is solved, latency rises but throughput does not fall.{{c:anubis-throughput}} Tying each pass to a fixed grant that halves on repeat gives every session a hard daily ceiling instead.

With the default policy, one session can spend at most **35,363** units in a day with tiers 0 to 2, and **47,175** with a step-up method enabled: a day of refill, the burst, and every grant until a repeat would buy less than 100 units. At 5 units a search that is about 7,000 to 9,400 searches a day. Someone who wants a million searches a day needs more than a hundred sessions, and new sessions are rationed per network.

A challenge is not an economic wall by itself. Solvers charge around $1 to $3 per thousand passes,{{c:solver-prices}} so a paid pass adds a fraction of a cent per thousand searches. Challenges do three jobs: they shut out clients with no JavaScript engine, they produce interaction signals, and they meter credit. The ceiling and the mint buckets do the limiting.

## New sessions and mint buckets {#mint}

A client that discards its cookie arrives as a new session every time. So every new session starts at tier 0 with 30 units for general pages only, and new sessions are counted per network:

| Mint bucket | Window | Default | Catches |
| --- | --- | --- | --- |
| Exact IP | 10 min | 20 new sessions | One machine discarding cookies |
| /24 or /48 prefix | 10 min | 60 new sessions | A small block, or an IPv6 host rotating addresses |
| ASN | 10 min | 5 × its own baseline | A proxy pool inside one provider |
| TLS fingerprint family | 10 min | 5 × baseline | One automation stack spread over many networks |

The response to pressure is a price, not a block: a proof-of-work 1.5 to 10 times harder, then a human check for new sessions on costly paths, and only at an extreme a `429`. Sessions that are already established or signed in are exempt, so a café or a mobile carrier's shared address does not lock out the people already using your site. In one study 60% of residential proxy addresses were seen only once in 90 days,{{c:ipinfo-rotation}} which is why the address is a bucket here and never the identity.

## The five-minute loop {#loop}

Some abuse is invisible one session at a time: a slow scrape spread over thousands of sessions, each under budget. Every five minutes Core merges the counters from your app instances, compares each cohort with its own baseline for that hour of the week, and turns every number into a named band such as `cost_vs_baseline: x6_plus`. Free text is removed: paths become your class names, user agents become a family.

Core then asks a decision model four typed questions about that state: is this automated abuse, how risky is it, what is it most likely for, and which is the least intrusive step that would contain it. The answer never acts directly. It becomes fields such as `ai.attack` and `ai.action` with an expiry, and your rules act on them like any other field. Stage an `ai.*` rule in `log` mode to set its thresholds from your own traffic, then let it enforce; the decision log keeps the model's answer beside what the rule did. The model can only raise a price or lower a cohort's budget, never block or allow a client.

| What happens | Which loop reacts | Time to effect |
| --- | --- | --- |
| One session exceeds its budget | Per request, in the SDK | The same request |
| One network mints sessions in a burst | Per request | Seconds on one instance; one sync interval across instances |
| Site-wide spend jumps | A deterministic tripwire, then the five-minute loop | One sync interval, then 5 to 10 minutes |
| Slow distributed scrape, every session under budget | Five-minute loop, through your `ai.*` rules | 10 to 15 minutes (two windows must agree) |
| The attack ends | Five-minute loop | 15 minutes to step down a level; 60 at most |
| You disagree with a mitigation | You, in the policy file | The next sync |

The [policy and cohort reference](/docs/policy/#cohorts) lists the cohort keys, the state and the directive fields.

## Explained decisions {#explain}

Every non-allow decision is written to a decision log in your bucket with a reference such as `BR-7F3K2Q`, which the visitor sees on the challenge. The log records the rule, the policy version, the budget, the cost and the model answer in force, so "why was this person challenged?" is a lookup, not a reconstruction.

```shell op=getDecision cap="Look up a decision by the reference the visitor saw"
curl -H "Authorization: Bearer $BR_CONSOLE_TOKEN" \
  "https://core.internal:8787/v1/decisions/BR-7F3K2Q?include=answer"

{ "ref": "BR-7F3K2Q", "ts": "2026-11-16T10:12:41Z", "action": "challenge", "tier": "human",
  "rule_id": "over-budget", "policy_version": 12, "risk_score": 1,
  "credits": 3, "cost": 5, "path_class": "search", "ai_answer_id": null }
```

An agent with read-only access to the same log answers in Slack, in the console and by email. It runs named queries and read-only SQL, attaches the query and rows to every answer, and suggests policy changes as a diff with a simulation. It publishes nothing: a named person approves every change.

## What it does not do {#not}

- **Floods and DDoS.** The request reaches your app before it is refused. Keep your CDN or WAF for volume; BotRampart refuses before your handler runs.
- **Cached pages and static files.** They never reach your app. The browser SDK still starts a session from a cached page and protects the data APIs behind it.
- **Headless browsers driven by a patient operator.** Proof-of-work does not stop them. Budgets ration them: they get bounded throughput per session, and sessions are rationed per network.

## Glossary {#glossary}

| Term | Meaning |
| --- | --- |
| Session | One `__br_s` cookie: a random 128-bit ID, a tier and an expiry. At most seven days. |
| Unit | The currency of a budget. A path class costs a whole number of units per request. |
| Path class | A named group of routes with one cost and a lowest tier, defined in the policy file. |
| Tier | The highest challenge a session has passed: 0 provisional, 1 proof-of-work, 2 human check, 3 step-up. |
| Grant | The credit a passed challenge buys: 300, 3,000 or 6,000 by default, halving on each repeat in 24 hours. |
| Mint bucket | A count of new sessions per IP, prefix, ASN or TLS fingerprint family in a 10-minute window. |
| Cohort | A group of sessions the five-minute loop watches: network class, session age and path class. |
| Directive | `ai.*` fields Core publishes for a cohort or session, with an expiry of at most 60 minutes. |
| Decision reference | The ID of a non-allow decision, such as `BR-7F3K2Q`, shown to the visitor and kept in the log. |
| Core | The service the SDKs sync with: challenges, policy, the hot store and the five-minute loop. |
| Lake | Your bucket, holding rollups, decisions, challenges, states, answers, directives and policy versions. |

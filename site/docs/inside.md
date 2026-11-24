---
title: Inside BotRampart
nav: Inside BotRampart
group: Concepts
order: 5
description: Inside BotRampart: each component and where it runs, the request path and session token, sync with Core, hosting and ports, the data layout in your bucket, the decision-model contract, the agent, threats and what remains, and the measured hot path.
lede: Know exactly what runs where and what stays in your bucket: one request and one sync followed through every component, the data layout, the threats that remain and what we measured.
---

This page follows one request and one sync through every component, then describes the data each one leaves in your bucket. The wire contract is the [OpenAPI spec](/spec/openapi.yaml); where this page and the spec differ, the spec wins.

## When to use {#when-to-use}

- You run BotRampart in production and need to know which component does what, and where it runs.
- You are reviewing what crosses each boundary: the cookie, the sync call, the lake, the decision model.
- You are sizing Core or choosing where to host it.
- You query the lake directly, or audit the decision model and the agent.
- You are assessing which threats BotRampart controls and what remains.

## Get started {#quickstart}

Trace one decision through the system:

1. A request arrives; the backend SDK or edge adapter verifies the `__br_s` cookie in memory and charges the session's budget, with no call to Core ([The request path](#path)).
2. Every 5 to 10 seconds each instance sends its counters and decisions to Core and receives policy, directives and revocations ([Sync](#sync)).
3. Core writes rollups and every non-allow decision to your bucket, keyed by the reference the visitor saw ([Data layout](#lake)).
4. Look that decision up by its reference:

```shell op=getDecision title="Look up a decision by its reference"
curl -H "Authorization: Bearer $BR_CONSOLE_TOKEN" \
  "https://core.internal:8787/v1/decisions/BR-7F3K2Q"
```

## Components {#components}

| Component | Does | Runs | Licence |
| --- | --- | --- | --- |
| Browser SDK `@botrampart/browser` | Solves proof-of-work in a Web Worker, collects interaction counts, renders challenges, retries a request after one. Size budget: 15 kB compressed, no dependencies. | Visitor's browser, served from your origin | Apache-2.0 |
| Backend SDK | Issues and verifies the session token, keeps budgets and mint buckets, evaluates policy, mounts `/_br`, syncs with Core. | Inside your app process | Apache-2.0 |
| Edge adapters | The backend SDK's checks in front of your app: an nginx module (ingress-nginx too), a Cloudflare Worker and a CloudFront Lambda@Edge function. | Your nginx, your Cloudflare account or your AWS account | Apache-2.0 |
| Mobile SDKs | Hold the session in native iOS and Android apps and answer challenges natively. | Inside your mobile app | Apache-2.0 |
| Core | Challenge service, sync API, hot rollups, replay cache, policy store, state builder, decision client. | Cloudflare Workers, or one container | AGPL-3.0, commercial licence available |
| Lake | Rollups, decisions, challenges, states, answers, directives, policy versions. | Your R2, S3, MinIO, GCS or Azure Blob | Open formats |
| Agent | Explains decisions, sends reports, suggests policy changes for a person to approve. Slack, email, console. | One container in your infrastructure | AGPL-3.0 |
| Console | Policy, path costs, live budgets, decision search, keys, audit log. | Static app served by Core | AGPL-3.0 |
| CLI `br` | Generates install files, checks an install, replays a session against a policy, rotates keys. | Your machine or CI | Apache-2.0 |
| Log pack | Vector configurations for nginx, ingress-nginx, ALB, CloudFront and Cloudflare logs; cohort rollups for traffic that never reaches the SDK. | Vector in your infrastructure | Apache-2.0 |

Core is AGPL-3.0 because it runs as a separate service, so copyleft rarely touches your code, while a provider that hosts a modified Core must publish its changes.

## The request path {#path}

Requests travel browser, edge, app server exactly as before. The backend SDK is a framework filter in your process; vendors ship the same thing as a "server-side module". What BotRampart avoids is the network call per request that most of them make:

| Product | Server-side check | Documented failure behaviour |
| --- | --- | --- |
| Cloudflare Turnstile | POST the token to siteverify; valid 300 seconds, intended for single use{{c:ts-single-use}} | The integrator's choice |
| DataDome | Module sends request metadata to the Protection API | Missing response header: treated as allowed{{c:dd-protapi}} |
| HUMAN (Akamai EdgeWorker enforcer) | Decrypts its risk cookie; may call the Risk API | Risk API timeout, 1,000 ms by default, then the request passes{{c:human-timeout}} |
| Vercel BotID | `checkBotId()` on routes declared in the client | An undeclared route fails the check{{c:botid-undeclared}} |
| BotRampart | Verifies the cookie in memory; tier 2 attestations with Core's public key | Keeps enforcing the last synced policy; per-route open or closed if the SDK itself errors |

### Session token {#token}

```text title="The __br_s cookie"
Set-Cookie: __br_s=br1.<payload>.<signature>; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=604800

payload (base64url JSON)
{ "v": 1, "sid": "k3Jv9s0QxT2mA7cR1uYb5w",       # 128 random bits, the only identifier
  "iat": 1794823500, "exp": 1794825300,          # 30-minute token, renewed on use
  "ses": 1795428300,                             # session ends after 7 days at most
  "tier": 1, "tx": { "2": 1794827100 },          # highest tier held, expiry of higher tiers
  "bind": { "ua": "chrome-131", "net": "AS64512" },  # soft binding: a mismatch drops to tier 0
  "uid": "9f2c…", "kid": "s3" }                  # keyed hash of login ID; signing key id

signature = HMAC-SHA256(site_secret[kid], "br1." + payload)
```

Soft binding records the browser family and the network's ASN. A mismatch does not block; it asks for a new proof-of-work. Binding to the exact IP breaks mobile users who roam, so BotRampart does not bind to it. A session seen from many networks in a short window raises its risk score.

## Sync {#sync}

The only regular conversation between your app and Core. Each instance posts counters and events; Core answers with policy, directives, revocations and the combined mint pressure.

```http op=syncInstance title="One sync exchange"
POST /v1/sync
Authorization: Bearer <instance key>
{ "instance": "app-7d9f", "policy_version": 12, "since": 1794823500,
  "sessions": [ { "sid": "7c1e09a4b2d3", "path_class": "search", "n": 41, "cost": 205, "s2xx": 40, "s4xx": 1, "tier": 1, "credits": 12 } ],
  "events":   [ { "ts": 1794823561, "type": "decision", "ref": "BR-7F3K2Q", "action": "challenge", "tier": "human", "rule": "over-budget" } ],
  "mint":     [ { "key": "prefix:203.0.113.0/24", "n": 14 } ] }

200 OK
{ "policy": null,
  "directives": [ { "id": "d_01JD…", "match": { "asn_class": "hosting", "session_age": "under_10m", "path_class": "search" },
                    "set": { "ai.attack": 0.96, "ai.intent": "content_scraping", "ai.action": "human_check", "ai.confidence": 0.64 },
                    "answer": "a_01JD7K…", "expires": 1794827400 } ],
  "revoked": [ "a41b77c2d9e0" ],
  "mint_pressure": [ { "key": "prefix:203.0.113.0/24", "multiplier": 4 } ],
  "spent": [ { "sid": "7c1e09a4b2d3", "total": 1240 } ],
  "next_sync_ms": 5000 }
```

## Core and hosting {#core}

Core's load follows sessions and sync ticks, not your request volume, because tokens are verified in your app. For a site with 100 million requests a month, our estimate is about 3 million calls to Core: 2.6 million syncs from 10 instances every 10 seconds, about 0.3 million for escalated challenges, and log rollup copies. That fits inside the 10 million requests the $5 Workers Paid plan includes.{{c:cf-workers-price}} The estimate rests on the session count and escalation rate above; replace them with your own measurements.

Core is written against Web-standard Request and Response on Hono, with storage behind small interfaces ("ports"), so it runs in three places:

| Need | Port | On Cloudflare | In one container |
| --- | --- | --- | --- |
| Configuration, keys, policy versions | `ConfigStore` | D1, KV as read cache | SQLite or Postgres |
| Hot rollups, baselines, replay cache, mint counters | `SiteShard` | SQLite-backed Durable Objects, one shard per site | SQLite file or Valkey |
| Lake writes | S3 API only | R2 | S3, MinIO, GCS |
| Ingest buffer | `enqueue(batch)` | Queues | In-process queue |
| Five-minute loop | `onWindowClose()` | Cron Trigger | Timer |
| Decision model | `DecisionProvider` | HTTPS | HTTPS or a local model |

Design rules: no storage write per request, no instance-field state in Durable Objects, idempotent consumers and windows, and no Analytics Engine or Pipelines. A third target is OpenOrange, an Apache-2.0 project from Rivet that runs Cloudflare Workers projects on Node.js in other clouds;{{c:oo-exists}} Core uses only the bindings it marks drop-in, so the same build can move into a customer's own AWS, Google Cloud or Azure account. The plain container stays the default self-hosted distribution because it has the fewest moving parts.

## Data layout {#lake}

```text title="Your bucket"
s3://<your-bucket>/br/v1/
  session_rollup_1m/site=<id>/dt=2026-11-16/hour=10/part-*.parquet   # from the backend SDK, through Core
  challenges/site=<id>/dt=…/part-*.parquet                            # issued, passed, failed, solve time, tier
  decisions/site=<id>/dt=…/part-*.parquet                             # every non-allow decision, with its reference
  ui_signals/site=<id>/dt=…/part-*.parquet                            # one row per session and per challenge
  state_5m/site=<id>/dt=…/<window>-<scope>.json                       # the exact state, numbers and bands
  answers/site=<id>/dt=…/<answer_id>.json                             # the exact model answer and cache status
  directives/site=<id>/dt=…/part-*.parquet                            # what was published, when it expired
  policy/site=<id>/v000012.yaml                                       # immutable versions, with approver
```

| Table | Key columns | Retention |
| --- | --- | ---: |
| session_rollup_1m | minute, sid_hash, uid_hash, path_class, requests, cost, s2xx, s4xx, s5xx, tier, credits_end, prefix, asn, country | 90 days |
| decisions | ts, ref, sid_hash, action, tier, rule_id, policy_version, risk_score, credits, cost, path_class, ai_answer_id, outcome | 13 months |
| challenges | ts, sid_hash, tier, method, difficulty, solve_ms, result, grant | 13 months |
| ui_signals | sid_hash, event counts, first_input_ms, automation_flag, viewport_class | 30 days |

The lake holds a hash of the session ID and a keyed hash of the login ID, never the cookie. Networks are stored as prefix, ASN and country, not the address. Writing every minute makes many small files, so one scheduled job compacts each closed hour into one file per table and is the only writer. Keeping 1 TB on R2 costs about $15 a month at $0.015 per GB-month, with no egress charge.{{c:r2-price}}

## Decision model contract {#decision}

Core sends the bands of a `br.state.v1` state as text with four typed questions, and stores the answer unchanged as `br.answer.v1`:

```json title="br.answer.v1"
{ "attack":     { "type": "noul",   "noul": 0.96, "confidence": 0.96 },
  "risk_level": { "type": "score",  "score": 3.1, "confidence": 0.58 },
  "intent":     { "type": "choice", "choice": "content_scraping", "confidence": 0.88 },
  "action":     { "type": "choice", "choice": "human_check", "confidence": 0.64 } }
```

- **Inputs are closed.** Only named bands and enums, no identifiers, no strings a visitor wrote.
- **Outputs are fields.** `ai.*` with an expiry of at most 60 minutes. The model can raise a tier or lower a budget, never block or allow.
- **Hysteresis.** Escalate when two windows agree; step down after three calm windows.
- **Cache.** `sha256(site | scope | policy_version | questions_version | model | bands)`, one hour. A changed band is a new question.
- **Providers.** One interface, `decide(input, questions) → answers`: Gemini Decision 1 by default in the cloud, or a self-hosted model so nothing leaves the network.
- **Live or shadow.** Rules act on model answers live; a rule set to `log` runs in shadow mode while you set thresholds.

## The agent {#agent}

| Tool | Does | Guardrail |
| --- | --- | --- |
| `explain_decision` | Rule, inputs, budget and model answer behind a reference, session or login ID | Fixed query |
| `session_timeline` | Minute-by-minute spend, tiers and challenges for one session | Fixed query |
| `replay` | Runs a policy version against a session's rollups | Same evaluator as the SDKs |
| `metric` | Named queries: top spenders, pass rates, spend by path class | Curated list |
| `sql` | Read-only SQL for the rest | One SELECT, row, size and time caps |
| `suggest_policy_change` | A policy diff with a reason and a simulation | A named person approves; separate credential |

The agent reads the lake through DuckDB with a key scoped read-only to `br/v1/`, uses your own model key or a local model, inherits the asking person's role, and attaches the query, row count, window, policy version and answer ID to every answer. In Slack it runs as an app each customer creates in their own workspace from a shipped manifest, over Socket Mode, so no inbound URL is exposed.

## Threats and what remains {#threats}

| Threat | Control | What remains |
| --- | --- | --- |
| Clients minting new sessions | Tier 0 allowance; mint buckets per IP, prefix and ASN; harder puzzles under pressure | Large residential proxy pools |
| Solved cookies handed to other clients | Budget is per session, so sharing a cookie shares one budget; soft binding; 30-minute tokens | Reuse within one network and browser family until the budget is spent |
| Paid solvers | Credit, not clearance; halving grants; daily ceiling | Bounded throughput per session for an operator who pays |
| Native proof-of-work solvers | Memory-hard puzzles, difficulty from risk; proof-of-work treated as a minting cost only | Still cheap for a funded attacker |
| Real browsers under automation | Budgets apply whoever drives the browser | Indistinguishable from a person until the budget runs out, which is the intent |
| Prompt injection into the model or agent | No visitor text in the state; closed outputs; rules hold the gate; agent cannot write | Traffic shaped to look like an organic spike; baselines are clamped so they cannot be walked up quickly |
| Compromised script delivery | First-party hosting, integrity hash, signed releases{{c:polyfill}} | Compromise of your own origin |
| Stolen site secret | Key IDs, overlapping rotation, separate keys per purpose | Tokens minted until rotation |
| Core outage | Core is not in the request path; static mode keeps tier 1, budgets and rules | No escalation above tier 1 while Core is down |

## Measured {#measured}

We measured the hot path on 18 November 2026: verifying the signed cookie and charging the budget in Node took about **1.79 µs** per request at the median and **2.58 µs** at the 99th percentile, over 300,000 requests across 10,000 sessions on an Apple M4 Pro Mac mini, far inside the 1 ms budget for the backend SDK; a forged cookie was rejected.{{c:exp-verify}} The [benchmark and its output](https://github.com/johnmafly/botrampart-site/tree/main/experiments) are in the repository; it measures the reference implementation of the cookie check and the budget charge.

## Where to go next {#where-next}

| Goal | Page |
| --- | --- |
| See the system diagrams and the five-minute loop | [Architecture](/docs/architecture/#loop) |
| Pick where BotRampart checks requests | [Choose how to integrate](/docs/choose/) |
| Wire the backend SDK into your app | [Wire it in](/docs/wire/) |
| Run Core and the lake in production | [Self-hosting](/docs/self-hosting/) |
| Review keys, privacy and the threat model in depth | [Security](/docs/security/) |
| Look up the sync, policy and decision operations | [API reference](/docs/api/) |

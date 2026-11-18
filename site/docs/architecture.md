---
title: Design and architecture
nav: Architecture
order: 2
description: BotRampart's components, where each runs, what crosses each boundary, the request path, sync, the five-minute loop, Core's ports, data layout and the decision-model contract, with diagrams.
lede: Each component, where it runs and what crosses each boundary. The per-request work happens inside your app; everything that needs the whole site's view happens in Core, off the request path.
---

## Components {#components}

| Component | Does | Runs | Licence |
| --- | --- | --- | --- |
| Browser SDK `@botrampart/browser` | Solves proof-of-work in a Web Worker, collects interaction counts, renders challenges, retries a request after one. Size budget: 15 kB compressed, no dependencies. | Visitor's browser, served from your origin | Apache-2.0 |
| Backend SDK | Issues and verifies the session token, keeps each live session's budget, evaluates policy, mounts `/_br`, sends counters to Core. Keeps no aggregated visitor metrics. | Inside your app process | Apache-2.0 |
| Core | Challenge service, sync API, hot rollups, replay cache, policy store, state builder, decision client. | Cloudflare Workers, or one container | AGPL-3.0 |
| Lake | Rollups, decisions, challenges, states, answers, directives, policy versions. | Your R2, S3, MinIO, GCS or Azure Blob | Open formats |
| Agent | Explains decisions and answers named metrics in Slack and the console. Reports by email and suggested policy changes are [not available yet](/docs/overview/#not-yet). | One container in your infrastructure | AGPL-3.0 |
| Console | A read-only view of policy, path costs, live budgets, decision search, keys and the audit log. Policy is edited in its file. | Static app served by Core | AGPL-3.0 |
| CLI `br` | Generates install files, checks an install, replays a session against a policy, rotates keys. | Your machine or CI | Apache-2.0 |
| Log pack | [Not available yet](/docs/overview/#not-yet). Vector configurations for nginx, ingress-nginx, ALB, CloudFront and Cloudflare logs; cohort rollups for traffic that never reaches the SDK. | Vector in your infrastructure | Apache-2.0 |

![BotRampart system overview: the browser SDK talks to the backend SDK in your app over normal requests and the /_br routes; the backend SDK syncs with Core every 5 to 10 seconds; Core writes to the lake in your bucket and asks a decision model every five minutes; Vector edge rollups to Core are not available yet; the agent reads the lake read-only.](/assets/docs/system.svg "System overview. Solid lines are always on; the edge is optional, and the Vector log pack is not available yet.")

## Design principles {#principles}

- **No network call per request.** The backend SDK verifies the signed cookie and charges the budget in memory. Core is never in the request path.
- **A light SDK.** The backend SDK holds only what the next request needs: each live session's budget and a short buffer of counters, which it sends to Core at each sync and then drops. It keeps no aggregated visitor metrics, baselines or history, so its memory and CPU stay flat as traffic grows. Rollups, baselines and cohorts are built in Core; history lives in your bucket.
- **Your data stays yours.** Logs, decisions and model answers go to your bucket in open formats. Core holds only hot counters and policy.
- **Price, do not judge.** No component labels a client a bot. Rules turn spend, tier and signals into a price: more work, a human check or a wait.
- **The model never holds the gate.** The decision model's answers become expiring fields. It runs in shadow mode: rules that act on them are [not available yet](/docs/overview/#not-yet).
- **Fail predictably.** If Core is down, the SDK keeps enforcing the last synced policy. If the SDK itself errors, each route fails open or closed as you choose.

## The request path {#request-path}

Requests travel browser, edge, app server exactly as before. The backend SDK is a framework filter in your process, so every protected request goes through five steps before your handler runs:

![The request path: a request with the __br_s cookie is verified with HMAC-SHA256 in memory, priced by its path class, charged against the session budget, then your rules decide: allow, challenge (403 with BR-Challenge), throttle (429 with Retry-After) or block.](/assets/docs/request-path.svg "The request path inside your app. Nothing here calls Core.")

Vendors ship the same shape as a "server-side module". What BotRampart avoids is the network call per request that most of them make:

| Product | Server-side check | Documented failure behaviour |
| --- | --- | --- |
| Cloudflare Turnstile | POST the token to siteverify; valid 300 seconds, intended for single use{{c:ts-single-use}} | The integrator's choice |
| DataDome | Module sends request metadata to the Protection API | Missing response header: treated as allowed{{c:dd-protapi}} |
| HUMAN (Akamai EdgeWorker enforcer) | Decrypts its risk cookie; may call the Risk API | Risk API timeout, 1,000 ms by default, then the request passes{{c:human-timeout}} |
| Vercel BotID | `checkBotId()` on routes declared in the client | An undeclared route fails the check{{c:botid-undeclared}} |
| BotRampart | Verifies the cookie in memory; tier 2 attestations with Core's public key | Keeps enforcing the last synced policy; per-route open or closed if the SDK itself errors |

## The session token {#token}

```text cap="The __br_s cookie"
Set-Cookie: __br_s=br1.<payload>.<signature>; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=604800

payload (base64url JSON)
{ "v": 1, "sid": "k3Jv9s0QxT2mA7cR1uYb5w",       # 128 random bits, the only identifier
  "iat": 1794823500, "exp": 1794825300,          # 30-minute token, renewed on use
  "ses": 1795428300,                             # session ends after 7 days at most
  "tier": 1, "tx": { "2": 1794827100 },          # highest tier held, expiry of higher tiers
  "bind": { "ua": "chrome-131", "net": "AS64512" },  # soft binding: a mismatch drops to tier 0
  "uid": "9f2c4e1ab7d0", "kid": "s3" }           # keyed hash of login ID; signing key id

signature = HMAC-SHA256(site_secret[kid], "br1." + payload)
```

Soft binding records the browser family and the network's ASN. A mismatch does not block; it asks for a new proof-of-work. Binding to the exact IP would break mobile users who roam. A session seen from many networks in a short window raises its risk score. The full field list is the [`SessionTokenPayload`](/docs/api/#schema-SessionTokenPayload) schema.

## Sync {#sync}

The only regular conversation between your app and Core. Each instance posts counters and events every 5 to 10 seconds; Core answers with policy, directives, revocations and the combined mint pressure. No per-request record leaves your app, and session IDs travel as hashes.

```http op=syncInstance cap="One sync exchange"
POST /v1/sync
Authorization: Bearer <instance key>
{ "instance": "app-7d9f", "policy_version": 12, "since": 1794823500,
  "sessions": [ { "sid": "7c1e09a4b2d3", "path_class": "search", "n": 41, "cost": 205, "s2xx": 40, "s4xx": 1, "tier": 1, "credits": 12 } ],
  "events":   [ { "ts": 1794823561, "type": "decision", "ref": "BR-7F3K2Q", "action": "challenge", "tier": "human", "rule": "over-budget" } ],
  "mint":     [ { "key": "prefix:203.0.113.0/24", "n": 14 } ] }

200 OK
{ "policy": null,
  "directives": [ { "id": "d_01JD7KQ3M8", "match": { "asn_class": "hosting", "session_age": "under_10m", "path_class": "search" },
                    "set": { "ai.attack": 0.96, "ai.intent": "content_scraping", "ai.action": "human_check", "ai.confidence": 0.64 },
                    "answer": "a_01JD7KQ2ZP", "expires": 1794827400 } ],
  "revoked": [ "a41b77c2d9e0" ],
  "mint_pressure": [ { "key": "prefix:203.0.113.0/24", "multiplier": 4 } ],
  "spent": [ { "sid": "7c1e09a4b2d3", "total": 1240 } ],
  "next_sync_ms": 5000 }
```

With budgets in memory, spend across instances is reconciled at each sync, so overspend is bounded by one sync interval; a Redis or Valkey store makes it exact.

## The five-minute loop {#loop}

![The five-minute loop: app instances send counters every 5 to 10 seconds; Core merges them per cohort against each cohort's baseline for that hour of the week; the state carries named bands only; a decision model answers four typed questions; Core publishes directives with ai.* fields that expire within 60 minutes, delivered at the next sync.](/assets/docs/five-minute-loop.svg "The five-minute loop. The model's answers become fields; rules decide.")

Every five minutes Core builds a `br.state.v1` state for the site and for each cohort that drifts from its baseline: numbers for people and the agent, and named bands that are the model's only input. It asks the decision model four typed questions and stores the answer unchanged as `br.answer.v1`. Answers become directives: `ai.*` fields for a cohort or session with an expiry of at most 60 minutes. A deterministic tripwire can publish a directive too, before the next window. The [policy reference](/docs/policy/#cohorts) lists every field.

## Core and its ports {#core}

Core's load follows sessions and sync ticks, not your request volume, because tokens are verified in your app. For a site with 100 million requests a month, our estimate is about 3 million calls to Core: 2.6 million syncs from 10 instances every 10 seconds, about 0.3 million for escalated challenges, and log rollup copies. That fits inside the 10 million requests the $5 Workers Paid plan includes.{{c:cf-workers-price}}

Core is written against Web-standard Request and Response on Hono, with storage behind small interfaces ("ports"), so the same code runs on Cloudflare and in one container:

| Need | Port | On Cloudflare | In one container |
| --- | --- | --- | --- |
| Configuration, keys, policy versions | `ConfigStore` | D1, KV as read cache | SQLite or Postgres |
| Hot rollups, baselines, replay cache, mint counters | `SiteShard` | SQLite-backed Durable Objects, one shard per site | SQLite file or Valkey |
| Lake writes | S3 API only | R2 | S3, MinIO, GCS |
| Ingest buffer | `enqueue(batch)` | Queues | In-process queue |
| Five-minute loop | `onWindowClose()` | Cron Trigger | Timer |
| Decision model | `DecisionProvider` | HTTPS | HTTPS or a local model |

Design rules: no storage write per request, no instance-field state in Durable Objects, idempotent consumers and windows, and no Analytics Engine or Pipelines. A third target is OpenOrange, an Apache-2.0 project from Rivet that runs Cloudflare Workers projects on Node.js in other clouds;{{c:oo-exists}} Core uses only the bindings it marks drop-in, so the same build can move into your own AWS, Google Cloud or Azure account. The plain container is the default self-hosted distribution because it has the fewest moving parts.

## Data layout {#lake}

```text cap="The lake, in your bucket"
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
| --- | --- | --- |
| session_rollup_1m | minute, sid_hash, uid_hash, path_class, requests, cost, s2xx, s4xx, s5xx, tier, credits_end, prefix, asn, country | 90 days |
| decisions | ts, ref, sid_hash, action, tier, rule_id, policy_version, risk_score, credits, cost, path_class, ai_answer_id, outcome | 13 months |
| challenges | ts, sid_hash, tier, method, difficulty, solve_ms, result, grant | 13 months |
| ui_signals | sid_hash, event counts, first_input_ms, automation_flag, viewport_class | 30 days |

The lake holds a hash of the session ID and a keyed hash of the login ID, never the cookie. Networks are stored as prefix, ASN and country, not the address. Writing every minute makes many small files, so one scheduled job compacts each closed hour into one file per table and is the only writer.

## Decision-model contract {#decision-model}

Core sends the bands of a `br.state.v1` state as text with four typed questions, and stores the answer unchanged as `br.answer.v1`:

```json cap="br.answer.v1 (answers only)"
{ "attack":     { "type": "noul",   "noul": 0.96, "confidence": 0.96 },
  "risk_level": { "type": "score",  "score": 3.1, "confidence": 0.58 },
  "intent":     { "type": "choice", "choice": "content_scraping", "confidence": 0.88 },
  "action":     { "type": "choice", "choice": "human_check", "confidence": 0.64 } }
```

- **Inputs are closed.** Only named bands and enums, no identifiers, no strings a visitor wrote.
- **Outputs are fields.** `ai.*` with an expiry of at most 60 minutes. Once rules can act on them, the model could raise a tier or lower a budget, never block or allow.
- **Hysteresis.** Escalate when two windows agree; step down after three calm windows.
- **Cache.** `sha256(site | scope | policy_version | questions_version | model | bands)`, one hour. A changed band is a new question.
- **Providers.** One interface, `decide(input, questions) → answers`: Gemini Decision 1 by default in the cloud, or a self-hosted model so nothing leaves the network.
- **Shadow mode only.** The model's answers are logged and act on nothing; rules that act on them are [not available yet](/docs/overview/#not-yet).

The full schemas are [`StateV1`](/docs/api/#schema-StateV1) and [`AnswerV1`](/docs/api/#schema-AnswerV1).

## The agent {#agent}

| Tool | Does | Guardrail |
| --- | --- | --- |
| `explain_decision` | Rule, inputs, budget and model answer behind a reference, session or login ID | Fixed query |
| `session_timeline` | Minute-by-minute spend, tiers and challenges for one session | Fixed query |
| `replay` | Runs a policy version against a session's rollups | Same evaluator as the SDKs |
| `metric` | Named queries: top spenders, pass rates, spend by path class | Curated list |
| `sql` | [Not available yet](/docs/overview/#not-yet). Read-only SQL for the rest | One SELECT, row, size and time caps |
| `suggest_policy_change` | [Not available yet](/docs/overview/#not-yet). A pending diff with a reason and a simulation | A named person approves; separate credential |

The agent reads the lake through DuckDB with a key scoped read-only to `br/v1/`, uses your own model key or a local model, inherits the asking person's role, and attaches the query, row count, window, policy version and answer ID to every answer. In Slack it runs as an app each customer creates in their own workspace from a shipped manifest, over Socket Mode, so no inbound URL is exposed.

## Licences {#licences}

The SDKs and the CLI are Apache-2.0, and so will the log pack be. Core, the agent and the console are AGPL-3.0: Core runs as a separate service, so copyleft rarely touches your code, while a provider that hosts a modified Core must publish its changes. A commercial licence in place of AGPL is part of the [Enterprise edition](/own/#editions), which is [not available yet](/docs/overview/#not-yet).

## Measured {#measured}

We measured the hot path on 18 November 2026: verifying the signed cookie and charging the budget in Node took about **1.79 µs** per request at the median and **2.58 µs** at the 99th percentile, over 300,000 requests across 10,000 sessions on an Apple M4 Pro Mac mini; a forged cookie was rejected.{{c:exp-verify}} The [benchmark and its output](https://github.com/johnmafly/botrampart-site/tree/main/experiments) are in the repository, and [Install and quickstart](/docs/getting-started/#from-source) shows how to run it. It measures the reference code, not a framework.

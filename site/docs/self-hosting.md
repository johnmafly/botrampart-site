---
title: Self-hosting and operations
nav: Self-hosting
order: 10
description: Running BotRampart yourself: where Core runs, sizing and what it costs, the lake and its retention, rolling out from observe to enforce, publishing policy safely, key rotation, monitoring coverage and failure behaviour.
lede: Every part of BotRampart runs on your own infrastructure under the Community edition. This page is the operator's view: what to run, what it costs, and how to change it safely.
---

## What you run {#what}

| Part | Where | State |
| --- | --- | --- |
| Backend SDK | Inside each app instance | Budgets in memory, or in Redis or Valkey |
| Core | Cloudflare Workers, one container, Kubernetes, or OpenOrange in your own cloud account | Configuration, keys and policy versions; hot rollups, baselines, replay cache and mint counters |
| Lake | Your bucket: R2, S3, MinIO, GCS or Azure Blob | Everything durable: rollups, decisions, challenges, states, answers, directives, policy versions |
| Agent | One container | None; it reads the lake |
| Log pack | Vector, next to your edge | None |

Core is never in the request path, so its availability bounds what can escalate, not what can be served. The [architecture](/docs/architecture/#core) page maps each of Core's ports to its Cloudflare and container backends.

## Sizing {#sizing}

Core's load follows sessions and sync ticks, not your request volume, because tokens are verified in your app. For a site with 100 million requests a month, our estimate is about 3 million calls to Core: 2.6 million syncs from 10 instances every 10 seconds, about 0.3 million for escalated challenges, and log rollup copies. That fits inside the 10 million requests the $5 Workers Paid plan includes.{{c:cf-workers-price}} In a container, the recommended footprint is 256 MB of memory and no database server.

## What it costs {#cost}

Our estimate for 100 million requests a month, from list prices and stated assumptions (10 app instances syncing every 10 seconds, 1,800 tokens a model call); replace them with your own measurements:

| Item | Estimate a month |
| --- | ---: |
| Core on Cloudflare Workers Paid{{c:cf-workers-price}} | about $5 to $10 |
| Decision log on R2, at $0.015 per GB-month{{c:r2-price}} | a few dollars |
| Decision model, one site-level call every 5 minutes{{c:gd-price}} | about $2 |
| Decision model, also per abnormal cohort (up to 50) | up to about $80 |
| Or one container on a host you already run | your hardware |

The Community edition itself costs nothing; the paid editions are on [Own it](/own/#editions).

## The lake {#lake}

| Table | Retention |
| --- | ---: |
| session_rollup_1m | 90 days |
| decisions | 13 months |
| challenges | 13 months |
| ui_signals | 30 days |

States, answers and directives are kept as JSON and Parquet beside them, and every published policy version as YAML with its approver. Writing every minute makes many small files, so one scheduled job compacts each closed hour into one file per table and is the only writer. The agent and your own tools read the lake with DuckDB or anything else that reads Parquet; the [data layout](/docs/architecture/#lake) lists every path and column.

## Rolling out {#rollout}

1. **Observe.** Start with `mode: "observe"`: every request is decided and logged, nothing is enforced. Within the first hour the decision log shows spend by path class, the sessions that would have been challenged and why, and path costs suggested from how long each path takes to answer.
2. **Simulate.** Replay any policy change against the last 24 hours with [`simulatePolicy`](/docs/api/#op-simulatePolicy). Check `signed_in_affected` before every publish.
3. **Enforce tier 1.** Switch to `mode: "enforce"` with the default policy. Ordinary browsing stays inside the refill rate and sees nothing.
4. **Stage new rules.** Give a new rule `mode: log` for a week before it enforces.
5. **Keep the model in shadow** until its answers match what you would have done; then let a rule act on an `ai.*` field.

## Changing policy safely {#changes}

- Every publish creates an immutable version with who published and who approved it, and SDKs pick it up at the next sync.
- Publishing names the version it was based on and fails with `409` if someone published in between.
- Roll back by publishing the previous version.
- The agent can only suggest a change: a pending diff with a reason and a simulation, approved by a named person with a separate credential.

## Keys {#keys}

Site keys sign session tokens and puzzles. Each token carries a key id, two keys are accepted at once during rotation, and keys are separate per purpose. The `br` CLI rotates keys. Clocks may disagree by up to 60 seconds. A stolen site secret lets someone mint tokens until you rotate it, so keep it in your secret store and rotate after any exposure.

## Monitoring coverage {#monitoring}

- **Every response carries `BR-Decision`.** Log it at the edge. A path in your access logs without it is a route the SDK does not cover.
- **Look up any refusal** by the reference the visitor quotes, with [`getDecision`](/docs/api/#op-getDecision) or the agent's `explain_decision`.
- **Watch the daily digest** the agent sends to Slack or email.
- **Edge-only traffic** reaches the five-minute loop through the Vector log pack and [`ingestRollups`](/docs/api/#op-ingestRollups).

## Failure behaviour {#failure}

| Failure | What happens |
| --- | --- |
| Core down | The SDK keeps verifying tokens, counting budgets and applying the last synced policy; directives expire on their own timers. Tier 2 cannot be served, so rules that need it fall back to throttle. |
| No decision model configured | The five-minute loop is off; everything else works. |
| SDK error or missing configuration | Fail mode per route: open for content, closed for login, sign-up and checkout. |
| An instance misses syncs | Revoked sessions still stop within 30 minutes, when their token expires. In-memory budgets reconcile at the next sync. |

---
title: Self-hosting and operations
nav: Self-hosting
group: Operate
order: 11
description: Running BotRampart yourself: where Core runs, sizing and what it costs, the lake and its retention, rolling out from observe to enforce, publishing policy safely, key rotation, monitoring coverage and failure behaviour.
lede: Every part of BotRampart runs on your own infrastructure under the Community edition. This page is the operator's view: what to run, what it costs, and how to change it safely.
---

Self-hosting means you run Core, the lake and the agent; the SDKs already run in your app. This page covers what that takes, what it costs, and how to roll out and change policy safely.

## When to use {#when-to-use}

- You are moving from a first install to production.
- You need a sizing and cost estimate for Core.
- You are planning the rollout from observe to enforce.
- You are on call and need the failure behaviour.

## Quickstart {#quickstart}

1. Run Core on Cloudflare Workers or in one container with 256 MB of memory.
2. Point `BR_LAKE_URL` at your bucket.
3. Deploy the backend SDK in observe mode and read the decision log for a day.
4. Simulate, then enforce tier 1 with the default policy, as [Rolling out](#rollout) describes.

> [!TIP]
> Roll back a policy by publishing the previous version. SDKs pick it up at the next sync, 5 to 10 seconds later.

## What you run {#what}

| Part | Where | State |
| --- | --- | --- |
| Backend SDK | Inside each app instance | Budgets in memory, or in Redis or Valkey |
| Core | Cloudflare Workers, one container, Kubernetes, or OpenOrange in your own cloud account | Configuration, keys and policy versions; hot rollups, baselines, replay cache and mint counters |
| Lake | Your bucket: R2, S3, MinIO, GCS or Azure Blob | Everything durable: rollups, decisions, challenges, states, answers, directives, policy versions |
| Agent | One container | None; it reads the lake |
| Edge adapters | Your nginx, Cloudflare Worker or CloudFront Lambda@Edge | Budgets in memory, synced with Core |
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
5. **Let the model's rules act.** Run each `ai.*` rule in `log` mode, compare its logged decisions with what you would have done, then switch it to `enforce`.

## Changing policy safely {#changes}

- Every publish creates an immutable version with who published and who approved it, and SDKs pick it up at the next sync.
- Publishing names the version it was based on and fails with `409` if someone published in between.
- Roll back by publishing the previous version.
- Edit in Git or in the console; both publish through the same call.
- The agent suggests changes as a diff with a simulation; a named person approves before anything publishes.

## Keys {#keys}

Site keys sign session tokens and puzzles. Each token carries a key id, two keys are accepted at once during rotation, and keys are separate per purpose. The `br` CLI rotates keys. Clocks may disagree by up to 60 seconds. A stolen site secret lets someone mint tokens until you rotate it, so keep it in your secret store and rotate after any exposure.

## Monitoring coverage {#monitoring}

- **Every response carries `BR-Decision`.** Log it at the edge. A path in your access logs without it is a route the SDK does not cover.
- **Look up any refusal** by the reference the visitor quotes, with [`getDecision`](/docs/api/#op-getDecision) or the agent's `explain_decision`.
- **Ask the agent** in Slack or the console for named metrics such as top spenders and pass rates.
- **Edge-only traffic** reaches the five-minute loop through the Vector log pack, which sends per-minute rollups to [`ingestRollups`](/docs/api/#op-ingestRollups).
- **Email digests** from the agent report spend, pass rates and refusals on a schedule.

## Failure behaviour {#failure}

| Failure | What happens |
| --- | --- |
| Core down | The SDK keeps verifying tokens, counting budgets and applying the last synced policy; directives expire on their own timers. Tier 2 cannot be served, so rules that need it fall back to throttle. |
| No decision model configured | The five-minute loop is off; everything else works. |
| SDK error or missing configuration | Fail mode per route: open for content, closed for login, sign-up and checkout. |
| An instance misses syncs | Revoked sessions still stop within 30 minutes, when their token expires. In-memory budgets reconcile at the next sync. |

## Where to go next {#where-next}

| Goal | Page |
| --- | --- |
| Set every Core setting and secret | [Configuration](/docs/configuration/#core) |
| Map Core's ports to your platform | [Design and architecture](/docs/architecture/#core) |
| Review threats and controls | [Security model](/docs/security/#threats) |
| Publish and roll back policy | [Policy reference](/docs/policy/#publishing) |
| Send edge rollups to Core | [Integrations](/docs/integrations/#edge) |

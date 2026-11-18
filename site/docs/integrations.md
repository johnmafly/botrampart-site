---
title: Integrations
nav: Integrations
order: 6
description: How BotRampart fits with your stack: your app and the SDK routes; Core on Cloudflare Workers, a container, Kubernetes or OpenOrange; R2, S3, MinIO, GCS and Azure Blob; Redis and Valkey; decision-model providers; Slack and the console.
lede: BotRampart sits inside your app and next to the infrastructure you already run. This page lists every system it connects to and how.
---

## Integration points {#integration-points}

BotRampart runs where you choose in your own infrastructure, never behind a vendor proxy. Each option verifies the same `__br_s` cookie and speaks the same [SDK routes](/docs/sdk/#routes) and headers.

| Integration point | Where it runs | Code change in your app | Status |
| --- | --- | --- | --- |
| Node backend SDK (Express, Fastify, Next.js) | Inside your app process | Yes: mount the SDK | Available |
| nginx module, including ingress-nginx | Your nginx, in front of your app | None | [not available yet](/docs/overview/#not-yet) |
| Cloudflare Worker | Your own Cloudflare account, in front of your origin | None | [not available yet](/docs/overview/#not-yet) |
| CloudFront (Lambda@Edge) | Your own AWS account, in front of your origin | None | [not available yet](/docs/overview/#not-yet) |

The [express AI install](/build/ai/) writes an instruction prompt for your coding agent for the stack you pick.

## Your app {#frameworks}

The backend SDK runs inside your Node app, in front of your handlers, with the [settings](/docs/configuration/#backend) in Configuration. Whatever the framework, the integration is the same on the wire, and the [API reference](/docs/api/) defines all of it:

| The SDK | Spec |
| --- | --- |
| Serves the browser SDK and the challenge routes under `/_br` on your origin | [SDK routes](/docs/sdk/#routes) |
| Answers a protected route with a challenge (403) or a throttle (429), marked `BR-Challenge: v1` | [`ChallengeRequired`](/docs/api/#response-challengerequired), [`Throttled`](/docs/api/#response-throttled) |
| Sets `BR-Sid` and `BR-Decision` on every response that passes through it | [Response headers](/docs/sdk/#headers) |
| Reads and removes `BR-Cost` from your response | [`BR-Cost`](/docs/sdk/#br-cost) |
| Sends counters to Core every 5 to 10 seconds and keeps no aggregated metrics | [`syncInstance`](/docs/api/#op-syncInstance) |

## Where Core runs {#hosting}

| Target | What it uses |
| --- | --- |
| Cloudflare Workers | D1 for configuration with KV as read cache, SQLite-backed Durable Objects (one shard per site), R2, Queues and a Cron Trigger. Workers Paid starts at $5 a month with 10 million requests included.{{c:cf-workers-price}} |
| One container (Docker) | SQLite or Postgres, an SQLite file or Valkey, an in-process queue and a timer. Recommended: 256 MB of memory. |
| Kubernetes | The same container, from plain manifests. |
| OpenOrange | Rivet's Apache-2.0 runtime for Cloudflare Workers projects on Node.js in other clouds;{{c:oo-exists}} Core uses only the bindings it marks drop-in, so the same build runs in your own AWS, Google Cloud or Azure account. |

## Object storage {#storage}

The lake is any S3-compatible bucket: Cloudflare R2, Amazon S3, MinIO, Google Cloud Storage or Azure Blob. Core writes through the S3 API only; tables are Parquet, states and answers JSON, policy versions YAML. Keeping 1 TB on R2 costs about $15 a month at $0.015 per GB-month, with no egress charge.{{c:r2-price}}

## Shared budgets: Redis and Valkey {#store}

By default each app instance keeps budgets in memory and reconciles spend at each sync. Set the backend SDK's [`store`](/docs/configuration/#backend) to a Redis or Valkey client to make budgets exact across instances.

## Edge, CDN and access logs {#edge}

- **Log and strip the headers.** Every response through the SDK carries `BR-Sid` and `BR-Decision`. Log both at the edge and strip them before the response leaves; the [nginx example](/docs/configuration/#headers) does both. A path in your logs without `BR-Decision` is a route the SDK does not cover.
- **Cached pages.** The SDK never sets the cookie on a response marked publicly cacheable, so your CDN keeps caching it; the browser SDK starts the session through `/_br`.
- **The log pack ([not available yet](/docs/overview/#not-yet)).** Vector configurations for nginx, ingress-nginx, ALB, CloudFront and Cloudflare logs will reduce each minute to rollups by site, key, prefix, path class and status class, and send them to Core for traffic that never reaches the SDK. Raw IPs, paths and the cookie never leave.

```http op=ingestRollups cap="One NDJSON line per rollup, the shape the log pack will send (not available yet)"
POST /v1/ingest/rollups
Authorization: Bearer <ingest key>
Content-Type: application/x-ndjson

{"site":"site_123","minute":"2026-11-16T10:05","key":"7c1e09a4b2d3","prefix":"203.0.113.0/24","asn":"AS64512","path_class":"search","status_class":"2xx","n":41,"br_decision":"allow"}
```

## Decision-model providers {#models}

The five-minute loop talks to one interface, `decide(input, questions) → answers`, set with `BR_DECISION_PROVIDER`.

| Provider | Notes |
| --- | --- |
| Gemini Decision 1 | The default in the cloud. Google launched the Gemini Decisions API with Gemini Decision 1 on 11 November 2026{{c:gd-launch}} at $0.10 per million input tokens with no output charge;{{c:gd-price}} one site-level question every five minutes costs on the order of a few dollars a month (our estimate, at about 1,800 tokens a call). |
| OpenAI | `BR_DECISION_PROVIDER: openai`. |
| A self-hosted model | Nothing leaves your network. |
| `off` | The loop is off; everything else works. |

The state the model sees follows Google's published guidance: numbers are compared in code and passed as named buckets,{{c:gd-guide-code}} and input is treated as untrusted.{{c:gd-guide-untrusted}}

## The agent's channels {#agent}

- **Slack.** The agent runs as an app each customer creates in their own workspace from a shipped manifest, over Socket Mode, so no inbound URL is exposed.
- **The console.** Served by Core, read-only.
- **Email.** Digests and answers by email are [not available yet](/docs/overview/#not-yet).
- **Your model key.** The agent uses your own model key or a local model, and reads the lake through DuckDB with a read-only key.

## Traffic that carries no cookie {#no-cookie}

| Situation | What to do |
| --- | --- |
| Webhooks, partner APIs, native mobile apps | Add a rule that allows requests authenticated by your own API key or signature before the over-budget rule. |
| Search engines and monitoring | The default policy allows verified crawlers: `net.verified_bot in ['search_engine', 'monitoring']`. |
| WebSockets and streams | Verified at the upgrade, charged by connection time, re-verified on a timer. |
| An API on another origin | Set the cookie `Domain` for sibling subdomains, or send the token in a header for cross-origin calls. |

## Your own tests {#testing}

- Run CI and staging in `observe` mode, and assert on the `BR-Decision` header of your app's responses in your own tests, before the edge strips it.
- Replay a changed policy against production traffic with [`simulatePolicy`](/docs/api/#op-simulatePolicy) before every publish.
- Look up any decision a tester saw by its reference with [`getDecision`](/docs/api/#op-getDecision).

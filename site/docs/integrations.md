---
title: Integrations
nav: Integrations
order: 6
description: How BotRampart fits with your stack: Express, Fastify and Next.js; Core on Cloudflare Workers, a container, Kubernetes or OpenOrange; R2, S3, MinIO, GCS and Azure Blob; Redis and Valkey; edge logs through Vector; decision-model providers; Slack, email and the console.
lede: BotRampart sits inside your app and next to the infrastructure you already run. This page lists every system it connects to and how.
---

## Web frameworks {#frameworks}

The backend SDK for Node is one package with an adapter per framework. Every adapter takes the same [options](/docs/configuration/#backend).

| Framework | How it mounts |
| --- | --- |
| Express | `app.use(br.express())` |
| Fastify | `await app.register(br.fastify())` |
| Next.js | Middleware: `middleware.ts` default-exports `botrampart({...})` from `@botrampart/node/next` |

```js op=syncInstance cap="server.js · Fastify"
import { botrampart } from "@botrampart/node";

const br = botrampart({ site: "site_123", secretsFile: "./secrets/br_keys",
  core: "http://localhost:8787", mode: "observe" });
await app.register(br.fastify());
```

```ts op=syncInstance cap="middleware.ts · Next.js"
import { botrampart } from "@botrampart/node/next";

export default botrampart({ site: "site_123", secretsFile: "./secrets/br_keys",
  core: "http://localhost:8787", mode: "observe" });
```

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

By default each app instance keeps budgets in memory and reconciles spend at each sync. Pass a Redis or Valkey client as `store` to make budgets exact across instances.

## Edge, CDN and access logs {#edge}

- **Log and strip the headers.** Every response through the SDK carries `BR-Sid` and `BR-Decision`. Log both at the edge and strip them before the response leaves; the [nginx example](/docs/configuration/#headers) does both. A path in your logs without `BR-Decision` is a route the SDK does not cover.
- **Cached pages.** The SDK never sets the cookie on a response marked publicly cacheable, so your CDN keeps caching it; the browser SDK starts the session through `/_br`.
- **The log pack.** Vector configurations for nginx, ingress-nginx, ALB, CloudFront and Cloudflare logs reduce each minute to rollups by site, key, prefix, path class and status class, and send them to Core for traffic that never reaches the SDK. Raw IPs, paths and the cookie never leave.

```http op=ingestRollups cap="Vector's HTTP sink, one NDJSON line per rollup"
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
- **Email.** Digests and answers.
- **The console.** Served by Core.
- **Your model key.** The agent uses your own model key or a local model, and reads the lake through DuckDB with a read-only key.

## Traffic that carries no cookie {#no-cookie}

| Situation | What to do |
| --- | --- |
| Webhooks, partner APIs, native mobile apps | Add a rule that allows requests authenticated by your own API key or signature before the over-budget rule. |
| Search engines and monitoring | The default policy allows verified crawlers: `net.verified_bot in ['search_engine', 'monitoring']`. |
| WebSockets and streams | Verified at the upgrade, charged by connection time, re-verified on a timer. |
| An API on another origin | Set the cookie `Domain` for sibling subdomains, or send the token in a header for cross-origin calls. |

## Your own tests {#testing}

- Run CI and staging in `observe` mode, and assert on `req.br.decision` in your own tests.
- Replay a changed policy against production traffic with [`simulatePolicy`](/docs/api/#op-simulatePolicy) before every publish.
- Look up any decision a tester saw by its reference with [`getDecision`](/docs/api/#op-getDecision).

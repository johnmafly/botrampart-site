---
title: Configuration
nav: Configuration
order: 5
description: Every BotRampart setting in one place: backend SDK options, browser SDK options, Core's settings and secrets, credentials and roles, site keys and rotation, the cookie, response headers and failure modes.
lede: Every setting, where it lives and what it does. The policy file has its own reference; this page covers everything around it.
---

## Where settings live {#where}

| What | Where | Reference |
| --- | --- | --- |
| Backend SDK options | Your app, where it mounts the backend SDK | [Backend SDK options](#backend) |
| Browser SDK options | The script tag and the browser SDK's settings | [Browser SDK options](#browser) |
| Core settings and secrets | Core's environment and secret store | [Core](#core) |
| Path classes, budgets, mint limits, rules | `botrampart.policy.yaml`, one per site, in Git or the console | [Policy reference](/docs/policy/) |
| Credentials | Your secret store | [Credentials and roles](#credentials) |

## Backend SDK options {#backend}

The backend SDK reads these settings when your app mounts it.

| Option | Default | What it does |
| --- | --- | --- |
| `site` | required | Site ID; keys, policy and lake partitions are per site. |
| `secretsFile` | required | HMAC keys that sign the session cookie and proof-of-work puzzles, so tier 1 works with Core unreachable. Alternative: tokens signed by Core with Ed25519, at one Core call per new session. |
| `core` | none | Core's URL. Without it the SDK runs alone: tiers 0 and 1, local budgets, the policy file on disk. |
| `store` | `"memory"` | Where budgets live. In memory, spend across instances is reconciled at each sync, so overspend is bounded by one sync interval; Redis or Valkey makes it exact. |
| `mode` | `"observe"` | `"observe"` decides and logs every request and lets it through; `"enforce"` applies the decisions. Start every install in observe mode. |
| `onCoreDown` | `"static"` | Tokens still verify, budgets still count, the last policy still applies. Tier 2 cannot be served, so rules that require it fall back to throttle. |

## Browser SDK options {#browser}

The script tag needs only the site ID: `<script src="/_br/sdk.js" data-site="site_123" async></script>`. The browser SDK's other settings:

| Option | Example | What it does |
| --- | --- | --- |
| `site` | `"site_123"` | Site ID, the same as the backend's. |
| `endpoint` | `"/_br"` | The first-party routes the backend SDK mounts. |
| `mode` | `"lazy"` | `"lazy"` solves the proof-of-work in the background; `"gate"` shows an interstitial first. |
| `autoRetry` | `true` | Wrap `fetch` and `XMLHttpRequest`: run a challenge when a response carries `BR-Challenge`, then retry the request once. |
| `signals` | `"standard"` | `"standard"`, `"minimal"` or `"off"`; see [what each collects](/docs/sdk/#signals). |
| `onBlock` | `onBlock(ref) {...}` | Called with the decision reference when a request is refused, so you can show it to the visitor. |

For EU sites, run `signals: "minimal"` or `"off"` and document the cookie as a security measure. France's regulator says anti-robot measures whose sole purpose is securing the site or its sign-in need no consent;{{c:cnil-antibot}} the cookie and signals must then be used for nothing else. This is an engineering reading, not legal advice.

## Core {#core}

| Setting | Example | What it does |
| --- | --- | --- |
| Port | `8787` | Where Core listens for sync, challenges, policy and decision lookups. |
| `BR_LAKE_URL` | `s3://acme-botrampart/br/v1/` | The lake: any S3-compatible URL. On Cloudflare, R2. |
| `BR_DECISION_PROVIDER` | `off` | The decision model for the five-minute loop: `off`, `gemini`, `openai`, or a self-hosted model. |
| Secret `br_keys` | | Site keys: the HMAC keys that sign session tokens and puzzles. The backend SDK reads the same file through `secretsFile`. |
| Secret `lake_writer` | | Credential that lets Core write the lake. |

On Cloudflare, Core's configuration is a Wrangler configuration with D1, KV, Durable Objects, R2, Queues and a Cron Trigger; in one container it uses SQLite or Postgres and an SQLite file or Valkey. The [ports table](/docs/architecture/#core) maps each.

## Credentials and roles {#credentials}

| Credential | Used by | For |
| --- | --- | --- |
| Instance key ([`instanceKey`](/docs/api/#security-instancekey)) | Each backend SDK deployment | `POST /v1/sync`. Stored with the site secrets, for example `/run/secrets/br_keys`. |
| Console token ([`consoleToken`](/docs/api/#security-consoletoken)) | Console, agent, CLI | Reading policy and decisions needs a viewer role; publishing a policy needs an admin role. The agent inherits the asking person's role. |
| Ingest key ([`ingestKey`](/docs/api/#security-ingestkey)) | Vector's HTTP sink | `POST /v1/ingest/rollups`. |
| Lake reader | The agent | A key scoped read-only to `br/v1/`. |

Routes under `/_br` take no credentials: the session travels in the first-party cookie.

## Site keys and rotation {#keys}

- Every signed token and puzzle carries a key id, `kid`, and two keys are accepted at once, so a new key overlaps the old one during rotation. The `br` CLI rotates keys.
- Keys are separate per purpose; the login-ID hash, for example, uses its own `site_uid_key`.
- Clocks may disagree by up to 60 seconds.
- Core's own Ed25519 public keys, which verify tier 2 and 3 attestations, are published at [`GET /v1/keys`](/docs/api/#op-getKeys).

## The cookie {#cookie}

| Attribute | Value |
| --- | --- |
| Name | `__br_s` |
| Format | `br1.<payload>.<signature>`, payload base64url JSON ([`SessionTokenPayload`](/docs/api/#schema-SessionTokenPayload)) |
| Flags | `Path=/; Secure; HttpOnly; SameSite=Lax` |
| Lifetime | Token 30 minutes, renewed once half its life has passed; session at most 7 days (`Max-Age=604800`) |
| Never set on | Responses marked publicly cacheable, so your CDN can still cache them |
| Other origins | Set the cookie `Domain` for sibling subdomains, or send the token in a header for cross-origin calls |

## Response headers {#headers}

| Header | Set by | Meaning |
| --- | --- | --- |
| `BR-Sid` | SDK | First 12 hex characters of SHA-256 of the session ID. Log it at the edge, then strip it. |
| `BR-Decision` | SDK | The decision for this request, such as `allow` or `challenge:human`. Log it, then strip it. |
| `BR-Cost` | Your app | The response's true cost in units; the SDK settles the difference and removes the header. |
| `BR-Challenge` | SDK | `v1` on a challenge (`403`) or throttle (`429`) response. |
| `Retry-After` | SDK | On a throttle: seconds until the budget has refilled enough to retry. |

```nginx cap="nginx: log the decision, then strip the headers"
log_format br escape=json '{"time":"$time_iso8601","path":"$uri","status":$status,'
  '"br_sid":"$upstream_http_br_sid","br_decision":"$upstream_http_br_decision"}';
proxy_hide_header BR-Sid;
proxy_hide_header BR-Decision;
```

## Failure modes {#failure}

| Situation | Behaviour |
| --- | --- |
| Core unreachable | `onCoreDown: "static"`: tokens verify, budgets count, the last synced policy applies, directives expire on their own timers. No escalation above tier 1. |
| SDK error or missing configuration | Fail mode per route: open for content, closed for login, sign-up and checkout. |
| Clock skew | 60 seconds of tolerance. |
| Key rotation | Two keys accepted at once. |
| Instances out of step | In-memory budgets reconcile at each sync; overspend is bounded by one sync interval. |

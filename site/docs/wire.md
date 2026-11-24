---
title: Wire it in
nav: Wire it in
group: Integrate
order: 8
description: Wire the backend SDK into your app by its HTTP contract: settings, the /_br routes, sync, challenges, headers, sign-in, signals, logs and testing.
lede: Put bot defense in front of your handlers in Express, Fastify, Next.js, Django, Rails, Laravel, Spring or Go. Every one speaks the same HTTP contract: the routes it serves, the headers it sets and the challenges it answers with.
---

This guide shows the contract every SDK and edge adapter implements, which is also what you test against. Every exchange is in the [OpenAPI spec](/spec/openapi.yaml), and each sample names its operation.

## Wire it in four steps {#quickstart}

1. Mount the backend SDK at the root of your app, ahead of your routes, with `site`, `secretsFile`, `core` and `mode: "observe"` ([Settings](#settings)).
2. Add the browser script tag to your page template (below).
3. Request any page and check that the response carries `BR-Sid` and `BR-Decision`, before your edge strips them (below).
4. Log `BR-Sid` and `BR-Decision` at your edge ([Logs and headers](#logs)), then replay a policy change against real traffic before you enforce ([Testing your integration](#test)).

```html op=getSdkScript title="Your page template"
<script src="/_br/sdk.js" data-site="site_123" async></script>
```

```shell title="Check a response from your app"
curl -sI https://www.example.com/ | grep -i '^br-'
```

> [!TIP]
> For a guided setup in your stack, open [Autoinstall](/docs/autoinstall/): it writes one prompt for your coding agent.

## Settings {#settings}

Mount the backend SDK once, at the root of your app and in front of your route handlers, so every route gets a path class by default. It reads these settings; [Configuration](/docs/configuration/#backend) has the full list.

| Setting | Default | What it does |
| --- | --- | --- |
| `site` | required | Site ID; keys, policy and lake partitions are per site. |
| `secretsFile` | required | HMAC keys that sign the session cookie and proof-of-work puzzles, so tier 1 works with Core unreachable. Alternative: tokens signed by Core with Ed25519, at one Core call per new session. |
| `core` | none | Core's URL. Without it the SDK runs alone: tiers 0 and 1, local budgets, the policy file on disk. |
| `store` | `"memory"` | Where budgets live. In memory, spend across instances is reconciled at each sync, so overspend is bounded by one sync interval; Redis or Valkey makes it exact. |
| `mode` | `"observe"` | `"observe"` decides and logs every request and lets it through; `"enforce"` applies the decisions. Start every install in observe mode. |
| `onCoreDown` | `"static"` | Tokens still verify, budgets still count, the last policy still applies. Tier 2 cannot be served, so rules that require it fall back to throttle. |

Where the SDK mounts in each framework:

| Framework | Where it mounts |
| --- | --- |
| Express | At the app's root, ahead of your routes. |
| Fastify | At the root, before your routes are registered. |
| Next.js | In front of every route the app serves, pages and API routes alike. |
| Django | As middleware at the top of the stack, ahead of your views. |
| Rails | As Rack middleware, ahead of your controllers. |
| Laravel | As global HTTP middleware, before your routes. |
| Spring | As a servlet filter, ahead of your controllers. |
| Go | As an `http.Handler` wrapping your router. |

## Routes on your origin {#routes}

The SDK serves these under `/_br` on your own origin. They take no credentials: the session travels in the first-party cookie.

| Route | Operation | Called by |
| --- | --- | --- |
| `GET /_br/sdk.js` | [`getSdkScript`](/docs/api/#op-getSdkScript) | The script tag |
| `GET /_br/challenge` | [`getChallenge`](/docs/api/#op-getChallenge) | The browser script, for a puzzle or a widget URL |
| `POST /_br/redeem` | [`redeemChallenge`](/docs/api/#op-redeemChallenge) | The browser script, with a solution or an attestation |
| `POST /_br/signals` | [`postSignals`](/docs/api/#op-postSignals) | The browser script, once per session and per challenge |
| `GET /_br/status` | [`getSessionStatus`](/docs/api/#op-getSessionStatus) | Your page, to read the session's tier |

```html op=getSdkScript title="Your page template"
<script src="/_br/sdk.js" data-site="site_123" async></script>
```

The script is the version bundled with the backend SDK, served with `Cache-Control: public, max-age=31536000, immutable` and `BR-SDK-Integrity`, the Subresource Integrity hash of the published release.

## Sync with Core {#sync}

Each instance sends its counters to Core every 5 to 10 seconds and receives policy, directives and revocations in the same call. No per-request record leaves your app; session IDs travel as hashes.

The SDK is kept light so it never slows your app: it holds each live session's budget and a short buffer of counters until the next sync, then drops them. It keeps no aggregated visitor metrics, baselines or history; Core builds those.

```http op=syncInstance title="One instance's sync, abridged"
POST https://core.internal:8787/v1/sync
Authorization: Bearer <instance key>

{ "instance": "app-7d9f", "policy_version": 12, "since": 1794823500,
  "sessions": [{ "sid": "7c1e09a4b2d3", "path_class": "search", "n": 41, "cost": 205, "tier": 1, "credits": 12 }],
  "events": [{ "ts": 1794823561, "type": "decision", "ref": "BR-7F3K2Q", "action": "challenge", "tier": "human", "rule": "over-budget" }] }

200 OK
{ "policy": null, "directives": [], "revoked": ["a41b77c2d9e0"], "next_sync_ms": 5000 }
```

## Challenges {#challenges}

A protected route that cannot be paid for answers `403` (or `429` with `Retry-After` for a throttle) instead of your app's response, with the header `BR-Challenge: v1`. With `autoRetry` on, the browser script runs the challenge and retries the request once when `retry` is `true`.

```http op=getChallenge title="Challenge response from any protected route"
HTTP/1.1 403 Forbidden
BR-Challenge: v1
Content-Type: application/json

{ "botrampart": { "v": 1, "action": "challenge", "tier": "human", "ref": "BR-7F3K2Q",
                  "url": "/_br/challenge?c=eyJ0IjoiaHVtYW4ifQ.c2ln", "retry": true } }
```

Fetch `url`: for tier 1 it returns a signed puzzle, for tier 2 a widget URL. The solution or the widget's attestation goes to `/_br/redeem`:

```http op=redeemChallenge title="Redeem a solved puzzle"
POST /_br/redeem
Content-Type: application/json

{ "type": "pow", "challenge": { "id": "ch_9Qx2LmT4vB7sK1aZ", "alg": "pbkdf2-sha256", "puzzles": 16, "...": "..." },
  "solutions": [4121, 977, 15003, 2210, 6431, 88, 3190, 7712, 504, 12880, 2999, 431, 9027, 1666, 5120, 7003],
  "solve_ms": 286 }

200 OK
Set-Cookie: __br_s=br1.…; Path=/; Secure; HttpOnly; SameSite=Lax
{ "ok": true, "tier": 1, "granted": 300, "credits": 300, "expires_at": 1794825300 }
```

A page navigation gets a small interstitial instead, which shows the reference so the visitor can quote it to your support team. That page carries the "Protected by BotRampart" mark in the Community edition.

## Response headers {#headers}

| Header | Set by | Meaning |
| --- | --- | --- |
| `BR-Sid` | The SDK, on every response | The first 12 hex characters of SHA-256 of the session ID, never the ID itself. |
| `BR-Decision` | The SDK, on every response | `allow`, `log`, `challenge:pow`, `challenge:human`, `throttle`, `block` or `degrade`. |
| `BR-Cost` | Your app, on its own response | The request's true cost in units. The SDK settles the difference from the path class's cost and removes the header. |
| `BR-Challenge` | The SDK | `v1` on a challenge or throttle response. |

Set `BR-Cost` on the response once you know what the request cost, for example the rows an export wrote:

<!-- tabs: Express | Fastify | Next.js -->
```js title="routes/export.js"
res.set("BR-Cost", String(rowsExported / 100));
```
```js title="routes/export.js"
reply.header("BR-Cost", String(rowsExported / 100));
```
```js title="app/api/export/route.js"
return new Response(body, { headers: { "BR-Cost": String(rowsExported / 100) } });
```
<!-- /tabs -->

## Signing in {#identify}

Once your user authenticates, attach their login ID to the session with the backend SDK's [`br.identify`](/docs/sdk/#identify). BotRampart stores only a keyed hash of it, `HMAC-SHA256(site_uid_key, login ID)`. Signed-in sessions refill three times faster, are exempt from network mint pressure, and their spend is also summed per account, so one account cannot fan out over many cookies.

## What the browser script collects {#signals}

| Mode | Collected |
| --- | --- |
| `standard` | Counts of pointer, touch and key events; time to first input; focus and visibility changes; proof-of-work solve time; viewport size class; the automation flag browsers expose. |
| `minimal` | Proof-of-work solve time and one "any input seen" flag. |
| `off` | Nothing beyond the proof-of-work solution. |
| Never, in any mode | Canvas, WebGL or audio fingerprints, font lists, stable device identifiers, keystroke content, pointer coordinates outside the challenge widget. |

```http op=postSignals title="Sent once per session and per challenge"
POST /_br/signals
{ "mode": "standard", "input_events": 14, "pointer_events": 9, "touch_events": 0, "key_events": 5,
  "first_input_ms": 1840, "automation_flag": false, "viewport_class": "desktop", "pow_solve_ms": 286 }
```

For EU sites, run `signals: "minimal"` or `"off"` and document the cookie as a security measure. France's regulator says anti-robot measures whose sole purpose is securing the site or its sign-in need no consent;{{c:cnil-antibot}} the cookie and signals must then be used for nothing else. This is an engineering reading, not legal advice.

## The policy file {#policy}

One versioned YAML file per site, kept in Git and editable in the console; every edit is a new version. Rules are evaluated in order and the first match wins. Conditions are written in CEL and compiled by Core into a typed condition tree, which every SDK evaluates with the same small interpreter and the same conformance suite.

```yaml op=putPolicy title="botrampart.policy.yaml (abridged)"
version: 12
path_classes:
  - { name: static,   match: ["/assets/*", "*.css", "*.js", "*.png"], cost: 0,  min_tier: 0 }
  - { name: general,  match: ["/*"],                                  cost: 1,  min_tier: 0 }
  - { name: search,   match: ["/api/search*"],                        cost: 5,  min_tier: 1 }
  - { name: login,    match: ["POST /login"],                         cost: 10, min_tier: 1 }
  - { name: checkout, match: ["/api/checkout*"],                      cost: 20, min_tier: 1 }
budget:
  refill_per_min: 20
  burst: 300
  provisional: 30
  grants: { pow: 300, human: 3000 }
  grant_decay: 0.5
  identified_multiplier: 3
mint: { ip: 20, prefix: 60, asn: baseline_x5 }
rules:
  - { id: verified-bots, when: "net.verified_bot in ['search_engine', 'monitoring']", then: allow }
  - { id: not-a-browser, when: "!ua.is_browser || ua.browser_age_years > 3", then: block }
  - { id: risk-5,        when: "risk.score >= 5", then: "challenge(human)" }
  - { id: ai-escalation, when: "ai.attack >= 0.9 && ai.confidence >= 0.7 && request.path_class in ['search', 'login']",
                         then: "pow(4)" }   # acts on the model's answer live; then: "log" runs it in shadow
  - { id: over-budget,   when: "session.credits < request.cost", then: "challenge(next_tier) || throttle" }
  - { id: default,       when: "true", then: allow }
```

| Fields | Examples | From |
| --- | --- | --- |
| `request.*` | path_class, cost, method | The request and your path classes |
| `session.*` | tier, age, credits, identified, network_changes_1h | The cookie and the local budget |
| `ua.*` | is_browser, family, browser_age_years | User agent, parsed against a bundled release table |
| `net.*` | mint_pressure, verified_bot, country, asn_class | Mint buckets, crawler verification |
| `signals.*` | automation_flag, no_input_after_30_requests | The browser script, checked on the server |
| `risk.score` | 0 to 10 | A visible scorecard in the same file, every line editable |
| `ai.*` | attack, risk_level, intent, action, confidence | The five-minute loop, with expiry |

Actions: `allow`, `log`, `challenge(pow | human | next_tier)`, `pow(multiplier)`, `throttle`, `block`, `degrade` (tell your app to serve a cheaper response) and `add_risk(n)`. A rule can run as `log` for a week before it enforces. Publishing creates an immutable version that SDKs pick up at the next sync; rollback is publishing the previous one. Always simulate first ([example](/docs/choose/#watch)).

## Logs and headers {#logs}

The cookie is a bearer credential and must never reach a log. Log `BR-Sid` and `BR-Decision` at your edge instead, then strip them. A path that shows up in your access logs without `BR-Decision` is a route the SDK does not cover.

```nginx title="nginx: log the decision, then strip the headers"
log_format br escape=json '{"time":"$time_iso8601","path":"$uri","status":$status,'
  '"br_sid":"$upstream_http_br_sid","br_decision":"$upstream_http_br_decision"}';
proxy_hide_header BR-Sid;
proxy_hide_header BR-Decision;
```

## Edge cases {#edges}

| Situation | What to do |
| --- | --- |
| Publicly cacheable pages | The SDK never sets the cookie on a response marked publicly cacheable, so your CDN can still cache it; the browser script starts the session through `/_br`. |
| An API on another origin | Set the cookie `Domain` for sibling subdomains, or send the token in a header for cross-origin calls. |
| WebSockets and streams | Verified at the upgrade, charged by connection time, re-verified on a timer. |
| Webhooks and partner APIs | Add a rule that allows requests authenticated by your own API key or signature before the over-budget rule. |
| Native mobile apps | Add the iOS or Android SDK to the app: it holds the session and answers challenges natively. |
| SDK error or missing configuration | Fail mode per route: open for content, closed for login, sign-up and checkout. |
| Clock skew and key rotation | 60 seconds of tolerance; two keys accepted during rotation. |

## Testing your integration {#test}

- Run CI and staging in `observe` mode, and assert on the `BR-Decision` header of your app's responses in your own tests, before the edge strips it.
- Replay a changed policy against production traffic with [`simulatePolicy`](/docs/api/#op-simulatePolicy) before every publish.
- Look up any decision a tester saw by its reference:

```shell op=getDecision title="Look up a decision by the reference the visitor saw"
curl -H "Authorization: Bearer $BR_CONSOLE_TOKEN" \
  "https://core.internal:8787/v1/decisions/BR-7F3K2Q"

{ "ref": "BR-7F3K2Q", "ts": "2026-11-16T10:12:41Z", "action": "challenge", "tier": "human",
  "rule_id": "over-budget", "policy_version": 12, "credits": 3, "cost": 5, "path_class": "search" }
```

## Next steps {#where-next}

<!-- next -->
- [Choose how to integrate](/docs/choose/#options): Compare the backend SDK with the edge adapters
- [SDK reference](/docs/sdk/): Read every route, header and method the SDKs expose
- [Configuration](/docs/configuration/#backend): See every setting with its default
- [Policy reference](/docs/policy/): Write path classes, budgets and rules
- [API reference](/docs/api/): Look up an operation and its fields
- [Inside BotRampart](/docs/inside/): See what runs where and which threats remain

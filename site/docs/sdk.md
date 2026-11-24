---
title: SDK reference
nav: SDK reference
group: Reference
order: 14
description: What BotRampart's SDKs expose (backend SDKs for Node, Python, Go, Java, Ruby and PHP, the edge adapters, the mobile SDKs and the browser SDK), as spec/openapi.yaml defines it: the routes the backend SDK mounts under /_br, the headers it sets and reads, br.identify, and the browser SDK served at /_br/sdk.js with br.status(), autoRetry, challenges and signals.
lede: Wire BotRampart into your app, your edge, your mobile app and the browser with one SDK surface. Each part links to its HTTP exchange, so you can also integrate over HTTP directly.
---

The SDKs are how BotRampart runs in your app, at your edge, in your mobile app and in the browser. This page lists what each one exposes on the wire, linked to the matching operation in the API reference.

## When to use {#when-to-use}

- You are mounting the backend SDK and want to know which routes it adds under `/_br`.
- You handle challenge responses yourself instead of using `autoRetry`.
- You set `BR-Cost` or attach a login ID with `br.identify`.
- You are choosing the browser SDK's signal mode.

## Get started {#quickstart}

1. Mount the backend SDK in front of your handlers, in observe mode, with the [settings](/docs/configuration/#backend) in Configuration.
2. Add the [script tag](#script-tag) to your layout.
3. Log and strip `BR-Sid` and `BR-Decision` at your edge.

Then ask the browser SDK for the session's tier:

```js op=getSessionStatus title="In the browser"
const { tier, expiresAt } = await br.status();
```

> [!TIP]
> With `autoRetry` on, the browser SDK runs a challenge and retries the request once, so most apps never handle a `403` themselves.

## Packages {#packages}

| SDK | Runs | Licence |
| --- | --- | --- |
| Backend SDK for Node | Express, Fastify and Next.js, inside your app process; mounts the [SDK routes](#routes) under `/_br` on your own origin | Apache-2.0 |
| Backend SDK for Python | Django middleware, inside your app process | Apache-2.0 |
| Backend SDK for Go | `net/http` middleware, inside your app process | Apache-2.0 |
| Backend SDK for Java | A Spring filter, inside your app process | Apache-2.0 |
| Backend SDK for Ruby | Rack middleware for Rails, inside your app process | Apache-2.0 |
| Backend SDK for PHP | Laravel middleware, inside your app process | Apache-2.0 |
| Edge adapters | The nginx module (with ingress-nginx), a Cloudflare Worker and CloudFront Lambda@Edge, in front of your app; each mounts the same routes | Apache-2.0 |
| Mobile SDKs | iOS and Android apps; see [Mobile SDKs](#mobile) | Apache-2.0 |
| Browser SDK, `@botrampart/browser` | The visitor's browser, served by the backend SDK from your own origin at `/_br/sdk.js` | Apache-2.0 |

The SDKs and the routes they mount are open source under Apache-2.0. Every backend SDK and edge adapter speaks the same routes and headers, so this page applies to each of them. The browser SDK is a versioned, immutable file served from your origin, with a published integrity hash and a signed release; no third-party domain serves the code your visitors run.

Every SDK evaluates the policy's compiled [condition trees](/docs/api/#schema-ConditionTree) with the same small interpreter and is checked by one conformance suite.

## Backend SDK {#backend}

The backend SDK sits in your process in front of your handlers. Its settings are in [Configuration](/docs/configuration/#backend).

### What it keeps {#keeps}

The backend SDK is kept light so it never slows your app: it holds each live session's budget and a short buffer of counters that it sends to Core with [`syncInstance`](/docs/api/#op-syncInstance) every 5 to 10 seconds, then drops. It keeps no aggregated visitor metrics, baselines or history; Core builds those, and the decision log lives in your bucket.

### Routes the backend SDK mounts {#routes}

| Route | Operation | Called by |
| --- | --- | --- |
| `GET /_br/sdk.js` | [`getSdkScript`](/docs/api/#op-getSdkScript) | The script tag |
| `GET /_br/challenge` | [`getChallenge`](/docs/api/#op-getChallenge) | The browser SDK, for a puzzle or a widget URL |
| `POST /_br/redeem` | [`redeemChallenge`](/docs/api/#op-redeemChallenge) | The browser SDK, with a solution or an attestation |
| `POST /_br/signals` | [`postSignals`](/docs/api/#op-postSignals) | The browser SDK, once per session and per challenge |
| `GET /_br/status` | [`getSessionStatus`](/docs/api/#op-getSessionStatus) | `br.status()` |

It also calls Core: [`syncInstance`](/docs/api/#op-syncInstance) every 5 to 10 seconds, and verifies tier 2 and 3 attestations with Core's public keys from [`getKeys`](/docs/api/#op-getKeys).

### Protected routes {#protected}

Any route the backend SDK protects can answer with a challenge ([`ChallengeRequired`](/docs/api/#response-challengerequired), 403) or a throttle ([`Throttled`](/docs/api/#response-throttled), 429) instead of your app's response. Both carry the header [`BR-Challenge: v1`](/docs/api/#header-br-challenge); the body is in [Handling challenges yourself](#challenges).

### Response headers {#headers}

| Header | Set by | Meaning |
| --- | --- | --- |
| [`BR-Sid`](/docs/api/#header-br-sid) | The SDK, on every response that passes through it | The first 12 hex characters of SHA-256 of the session ID, never the ID itself. |
| [`BR-Decision`](/docs/api/#header-br-decision) | The SDK, on every response that passes through it | The decision for this request: `allow`, `log`, `challenge:pow`, `challenge:human`, `challenge:step_up`, `throttle`, `block` or `degrade`. `challenge:step_up` marks a tier 3 method. |
| [`BR-Cost`](#br-cost) | Your app, on its own response | The request's actual cost in units. |

Your edge logs `BR-Sid` and `BR-Decision` and strips them before the response leaves; the [nginx example](/docs/configuration/#headers) does both.

### `BR-Cost` {#br-cost}

For responses whose cost is only known afterwards (a report, an export), set `BR-Cost` on your response. The SDK charges the difference from the path class's cost and removes the header.

```js cap="Settle the true cost of an export"
res.set("BR-Cost", String(rowsExported / 100));
```

### `br.identify` {#identify}

Attaches your user's login ID to the session once they authenticate. BotRampart stores only a keyed hash of it, `HMAC-SHA256(site_uid_key, login ID)`, as the session's [`uid`](/docs/api/#schema-UidHash). Signed-in sessions refill at the policy's `identified_multiplier` (3 in the default policy), are exempt from network mint pressure, and their spend is also summed per account up to `account_ceiling_per_hour`, so one account cannot fan out over many cookies.

## Browser SDK {#browser}

### Script tag {#script-tag}

```html op=getSdkScript cap="Your page template"
<script src="/_br/sdk.js" data-site="site_123" async></script>
```

[`getSdkScript`](/docs/api/#op-getSdkScript) serves the version bundled with the backend SDK; add `?v=1.0.0` to pin one. The response carries `Cache-Control: public, max-age=31536000, immutable`, an `ETag` and `BR-SDK-Integrity`, the Subresource Integrity hash of the published release. Its settings are in [Configuration](/docs/configuration/#browser).

### Methods {#methods}

| Method | Does |
| --- | --- |
| `br.status()` | The session's tier and expiries, from [`GET /_br/status`](/docs/api/#op-getSessionStatus) ([`SessionStatus`](/docs/api/#schema-SessionStatus)). The HttpOnly cookie itself is never readable by page scripts. |

```js op=getSessionStatus cap="The same exchange over HTTP, from your own origin"
await fetch("/_br/status").then((r) => r.json());
// { "tier": 1, "expiresAt": 1794825300, "sessionEndsAt": 1795428300, "tierExpiresAt": {}, "identified": false }
```

### Handling challenges yourself {#challenges}

With `autoRetry`, the browser SDK keys on `BR-Challenge`, runs the challenge and retries the original request once when the body's `retry` is `true`. If you handle responses yourself, a protected route answers `403` (or `429` with `Retry-After` for a throttle) with the header `BR-Challenge: v1` and this body:

```http op=getChallenge cap="Challenge response from any protected route"
HTTP/1.1 403 Forbidden
BR-Challenge: v1
Content-Type: application/json

{ "botrampart": { "v": 1, "action": "challenge", "tier": "human", "ref": "BR-7F3K2Q",
                  "url": "/_br/challenge?c=eyJ0IjoiaHVtYW4ifQ.c2ln", "retry": true } }
```

Fetch `url`: for tier 1 it returns a signed puzzle, for tiers 2 and 3 a widget URL. The solution or the widget's attestation goes to `/_br/redeem`:

```http op=redeemChallenge cap="Redeem a solved puzzle"
POST /_br/redeem
Content-Type: application/json

{ "type": "pow", "challenge": { "id": "ch_9Qx2LmT4vB7sK1aZ", "alg": "pbkdf2-sha256", "puzzles": 16, "...": "..." },
  "solutions": [4121, 977, 15003, 2210, 6431, 88, 3190, 7712, 504, 12880, 2999, 431, 9027, 1666, 5120, 7003],
  "solve_ms": 286 }

200 OK
Set-Cookie: __br_s=br1.…; Path=/; Secure; HttpOnly; SameSite=Lax
{ "ok": true, "tier": 1, "granted": 300, "credits": 300, "expires_at": 1794825300 }
```

A page navigation gets a small HTML interstitial instead, which loads the same challenge and shows the reference so the visitor can quote it to your support team. That page carries the "Protected by BotRampart" mark in the Community edition.

### Signals {#signals}

| Mode | Collected |
| --- | --- |
| `standard` | Counts of pointer, touch and key events; time to first input; focus and visibility changes; proof-of-work solve time; viewport size class; the automation flag browsers expose. |
| `minimal` | Proof-of-work solve time and one "any input seen" flag. |
| `off` | Nothing beyond the proof-of-work solution. |
| Never, in any mode | Canvas, WebGL or audio fingerprints, font lists, stable device identifiers, keystroke content, pointer coordinates outside the challenge widget. |

```http op=postSignals cap="Sent once per session and per challenge"
POST /_br/signals
{ "mode": "standard", "input_events": 14, "pointer_events": 9, "touch_events": 0, "key_events": 5,
  "first_input_ms": 1840, "automation_flag": false, "viewport_class": "desktop", "pow_solve_ms": 286 }
```

The server checks signals; the policy reads them as `signals.*` fields, such as `signals.automation_flag`.

## Mobile SDKs {#mobile}

The iOS and Android SDKs protect your native app's calls to your API with the same budgets and rules as the browser. Each one:

- **Carries the session token.** It stores the signed token in the platform's secure storage and sends it in a request header, since an app has no cookie jar shared with your site.
- **Solves the proof-of-work natively.** The same signed puzzle from [`getChallenge`](/docs/api/#op-getChallenge), solved off the main thread and redeemed at [`/_br/redeem`](/docs/api/#op-redeemChallenge).
- **Presents challenges in the app.** A human check or step-up method opens in a native sheet, and the original call retries once, like `autoRetry` in the browser.
- **Reports the same signals.** The `standard`, `minimal` and `off` modes collect the same counts and never collect device identifiers.

## Where to go next {#where-next}

| Goal | Page |
| --- | --- |
| Set every option for each SDK | [Configuration](/docs/configuration/#backend) |
| Read the HTTP exchange behind each route | [API reference](/docs/api/) |
| Write rules on `signals.*` fields | [Policy reference](/docs/policy/#fields) |
| Pick a backend SDK, an edge adapter or a mobile SDK | [Choose an integration](/docs/choose/) |
| Wire the SDK into your app | [Wire it in](/docs/wire/) |

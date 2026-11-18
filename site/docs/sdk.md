---
title: SDK reference
nav: SDK reference
order: 8
description: The BotRampart backend SDK for Node (botrampart(), framework adapters, br.protect, br.identify, br.track, req.br, BR-Cost) and the browser SDK (BotRampart.init, ready, ensure, challenge, status, signals), with the HTTP routes behind each.
lede: The two SDKs and everything they expose. Each function maps to an HTTP exchange in the spec, linked beside it.
---

## Packages {#packages}

| Package | Runs | Licence |
| --- | --- | --- |
| `@botrampart/node` | Your Node app: Express, Fastify, and Next.js through `@botrampart/node/next` | Apache-2.0 |
| `@botrampart/browser` | The visitor's browser, served from your origin at `/_br/sdk.js` | Apache-2.0 |

Every SDK evaluates the policy's compiled [condition trees](/docs/api/#schema-ConditionTree) with the same small interpreter and is checked by one conformance suite.

## Backend SDK {#backend}

### `botrampart(options)` {#botrampart}

Creates the SDK for one site. The options are in [Configuration](/docs/configuration/#backend): `site`, `secretsFile`, `core`, `store`, `mode` and `onCoreDown`. It returns `br`, used below.

### Framework adapters {#adapters}

| Call | Framework | Does |
| --- | --- | --- |
| `br.express()` | Express | Middleware: mounts `/_br/*`, verifies the cookie, charges the request, applies policy and sets `req.br`. |
| `br.fastify()` | Fastify | The same, as a plugin: `await app.register(br.fastify())`. |
| `botrampart({...})` from `@botrampart/node/next` | Next.js | The same, as the default export of `middleware.ts`. |

Mount the SDK at the root of your app so every route gets a path class by default.

### `br.protect({ cost })` {#protect}

Prices one route in code, overriding its path class. `cost` is a number of units, or a function of the request that returns one.

```js op=redeemChallenge cap="Per-route costs"
app.get("/api/search", br.protect({ cost: 5 }), search);

// One GraphQL endpoint: price each operation by what it does
const COST = { ProductPage: 2, SearchProducts: 5, ExportOrders: 50 };
app.post("/graphql", br.protect({ cost: (req) => COST[req.body.operationName] ?? 10 }), graphql);

// A session that cannot pay gets a challenge response; once it passes and redeems,
// the browser SDK retries the request with the new credit.
```

### `BR-Cost` {#br-cost}

For responses whose cost is only known afterwards (a report, an export), set `BR-Cost` on your response. The SDK charges the difference from the path class's cost and removes the header.

```js cap="Settle the true cost of an export"
res.set("BR-Cost", String(rowsExported / 100));
```

### `br.identify(req, res, userId)` {#identify}

Attaches your user's ID once they authenticate. BotRampart stores only a keyed hash of it, `HMAC-SHA256(site_uid_key, userId)`, in the session as `uid`. Signed-in sessions refill three times faster, are exempt from network mint pressure, and their spend is also summed per account (`account_ceiling_per_hour`), so one account cannot fan out over many cookies.

### `br.track(req, event)` {#track}

Records an application event for the next sync. `"login_failed"` feeds the credential-stuffing metrics.

```js op=syncInstance cap="Login handler"
app.post("/login", async (req, res) => {
  const user = await authenticate(req);
  if (!user) {
    br.track(req, "login_failed");       // feeds credential-stuffing metrics at the next sync
    return res.sendStatus(401);
  }
  br.identify(req, res, user.id);        // stores HMAC-SHA256(site_uid_key, user.id) in the session
  res.json({ ok: true });
});
```

### `req.br` {#req-br}

Every request that passes through the SDK carries `req.br`:

| Field | Meaning |
| --- | --- |
| `sessionId` | The session this request belongs to. |
| `tier` | Highest tier the session holds, 0 to 3. |
| `credits` | The session's balance. |
| `identified` | Whether a login ID is attached. |
| `risk.score` | The scorecard's total, 0 to 10. |
| `ai` | The `ai.*` fields in force for this session, if any. |
| `decision.action` | What the SDK decided, as in the [`BR-Decision`](/docs/api/#header-br-decision) header. |
| `decision.ruleId` | The rule that matched. |
| `decision.ref` | The decision reference, such as `BR-7F3K2Q`, for non-allow decisions. |

`degrade` tells your app to serve a cheaper response. In `observe` mode the decision is computed and logged but the request always reaches your handler, so tests can assert on `req.br.decision`.

### Routes the backend SDK mounts {#routes}

| Route | Operation | Called by |
| --- | --- | --- |
| `GET /_br/sdk.js` | [`getSdkScript`](/docs/api/#op-getSdkScript) | The script tag |
| `GET /_br/challenge` | [`getChallenge`](/docs/api/#op-getChallenge) | The browser SDK, for a puzzle or a widget URL |
| `POST /_br/redeem` | [`redeemChallenge`](/docs/api/#op-redeemChallenge) | The browser SDK, with a solution or an attestation |
| `POST /_br/signals` | [`postSignals`](/docs/api/#op-postSignals) | The browser SDK, once per session and per challenge |
| `GET /_br/status` | [`getSessionStatus`](/docs/api/#op-getSessionStatus) | `br.status()` |

It also calls Core: [`syncInstance`](/docs/api/#op-syncInstance) every 5 to 10 seconds, and verifies tier 2 and 3 attestations with Core's public keys from [`getKeys`](/docs/api/#op-getKeys).

## Browser SDK {#browser}

### Script tag {#script-tag}

```html op=getSdkScript cap="Your page template"
<script src="/_br/sdk.js" data-site="site_123" async></script>
```

### `BotRampart.init(options)` {#init}

```js op=getChallenge cap="app.js"
import { BotRampart } from "@botrampart/browser";

const br = BotRampart.init({
  site: "site_123",
  endpoint: "/_br",          // first-party routes mounted by the backend SDK
  mode: "lazy",              // solve in the background; "gate" shows an interstitial first
  autoRetry: true,
  signals: "standard",       // "standard" | "minimal" | "off"
  onBlock(ref) { showSupportMessage(ref); },
});

await br.ready();            // resolves once tier 1 is held
await br.ensure("human");    // step up before a sensitive action, such as opening checkout
```

The options are in [Configuration](/docs/configuration/#browser).

### Methods {#methods}

| Method | Does |
| --- | --- |
| `br.ready()` | Resolves once the session holds tier 1, after the background proof-of-work. |
| `br.ensure(tier)` | Steps the session up to the named tier ([`TierName`](/docs/api/#schema-TierName)), such as `"human"`, before a sensitive action. |
| `br.challenge(descriptor)` | Runs the challenge described by a challenge response body, then redeems it. |
| `br.status()` | The session's tier and expiries, from `GET /_br/status` ([`SessionStatus`](/docs/api/#schema-SessionStatus)). |

### Handling challenges yourself {#challenges}

With `autoRetry`, the SDK runs a challenge and retries the request once. If you handle responses yourself, a protected route answers `403` (or `429` with `Retry-After` for a throttle) with the header `BR-Challenge: v1` and this body:

```http op=getChallenge cap="Challenge response from any protected route"
HTTP/1.1 403 Forbidden
BR-Challenge: v1
Content-Type: application/json

{ "botrampart": { "v": 1, "action": "challenge", "tier": "human", "ref": "BR-7F3K2Q",
                  "url": "/_br/challenge?c=eyJ0IjoiaHVtYW4ifQ.c2ln", "retry": true } }
```

Pass the descriptor to `br.challenge()`, or fetch `url` yourself: for tier 1 it returns a signed puzzle, for tier 2 a widget URL. The solution or the widget's attestation goes to `/_br/redeem`:

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

For a page navigation the SDK serves a small interstitial instead, which shows the reference so the visitor can quote it to your support team. That page carries the "Protected by BotRampart" mark in the Community edition.

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

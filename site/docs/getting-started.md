---
title: Install and quickstart
nav: Install and quickstart
order: 4
description: Run BotRampart's reference code from source in a few minutes, then wire the backend and browser SDKs into a Node app in observe mode, simulate a policy and enforce.
lede: Two paths. Run the reference budget engine and its benchmark from source in a few minutes, then wire BotRampart into a Node app in observe mode, where it decides and logs every request and enforces nothing.
---

## Run the reference code from source {#from-source}

The repository holds the reference implementation of the budget algorithm, the cookie-verification benchmark and the tests that check every number this guide quotes. You need Git and Node.js 24 or newer; there are no dependencies to install.

```shell cap="Clone, test and benchmark"
git clone https://github.com/johnmafly/botrampart-site.git
cd botrampart-site
npm test          # builds the site and runs every test, including the budget algorithm's
npm run bench     # verifies 300,000 signed cookies across 10,000 sessions and charges each request
```

`npm run bench` prints its result as JSON, with the median, 90th, 99th and 99.9th percentile per request in microseconds and whether a forged cookie was rejected. The run recorded in the repository measured 1.79 µs at the median and 2.58 µs at the 99th percentile on an Apple M4 Pro.{{c:exp-verify}}

Then drive the budget engine yourself. Save this as `try-budget.mjs` in the repository root and run `node try-budget.mjs`:

```js cap="try-budget.mjs"
import { newSession, charge, pass, dailyCeiling } from "./site/assets/economics.mjs";

const t = Date.now();
const session = newSession(t);                 // tier 0, 30 units
console.log(charge(session, "search", t));     // search needs tier 1
console.log(pass(session, "pow", t));          // proof-of-work grant
console.log(charge(session, "search", t));     // now it pays
console.log(dailyCeiling());                   // most one session spends in a day
```

```text cap="Output"
{ action: 'challenge', challenge: 'pow', cost: 5, credits: 30 }
300
{ action: 'allow', cost: 5, credits: 325 }
35363
```

`newSession`, `charge`, `pass`, `nextChallenge`, `nextGrant` and `dailyCeiling` take an optional policy as their last argument; `DEFAULT_POLICY` is the default policy described in [Request economics](/docs/overview/#economics).

## What your app needs {#need}

- A Node app on Express, Fastify or Next.js.
- Somewhere to run Core: a Cloudflare account (Workers Paid starts at $5 a month{{c:cf-workers-price}}) or any host that runs one container. Recommended: 256 MB of memory. No database server.
- An S3-compatible bucket: Cloudflare R2, Amazon S3 or MinIO.
- Optional: a key for a decision-model provider, or a self-hosted model. Without one, the five-minute loop is off and everything else works.

## 1. Configure Core {#core}

Core listens on port 8787. These are the settings and secrets it starts with; [Configuration](/docs/configuration/#core) explains each.

| Setting | Example | Meaning |
| --- | --- | --- |
| `BR_LAKE_URL` | `s3://acme-botrampart/br/v1/` | Where the lake lives |
| `BR_DECISION_PROVIDER` | `off` | `off`, `gemini`, `openai`, or a self-hosted model |
| Secret `br_keys` | site keys | Signs session tokens and puzzles |
| Secret `lake_writer` | bucket credential | Lets Core write the lake |

## 2. Add the backend SDK in observe mode {#sdk}

Mount the SDK at the root of your app so every route gets a path class by default. In `observe` mode it decides every request and logs the decision, but lets everything through.

```js op=syncInstance cap="server.js · Node, Express"
import express from "express";
import { botrampart } from "@botrampart/node";

const app = express();
const br = botrampart({
  site: "site_123",
  secretsFile: "./secrets/br_keys",
  core: "http://localhost:8787",   // counters sync here every 5 to 10 seconds
  mode: "observe",                 // decide and log, enforce nothing
});
app.use(br.express());             // mounts /_br/*, verifies, charges, sets req.br
```

Fastify and Next.js use the same options; see [Integrations](/docs/integrations/#frameworks).

## 3. Add the browser SDK {#script}

One script tag, served from your own origin by the backend SDK, so no third-party domain can change the code your visitors run. That is the lesson of the 2024 Polyfill.io incident, when a CDN script under new ownership served malware to more than 100,000 sites.{{c:polyfill}}

```html op=getSdkScript cap="Your page template"
<script src="/_br/sdk.js" data-site="site_123" async></script>
```

## 4. Check the session {#check}

Open your site and ask what the browser holds. A first visit is tier 0; a moment later the proof-of-work has run in the background and the session is tier 1.

```js op=getSessionStatus cap="In the browser, from your own origin"
await fetch("/_br/status").then((r) => r.json());
// { "tier": 1, "expiresAt": 1794825300, "sessionEndsAt": 1795428300, "tierExpiresAt": {}, "identified": false }
```

## 5. Watch, then simulate {#observe}

Within the first hour the decision log in your bucket shows spend by path class, the sessions that would have been challenged and why, and path costs suggested from how long each path takes to answer. Replay a changed policy against that traffic before you enforce anything:

```shell op=simulatePolicy cap="Replay a policy against the last 24 hours"
curl -X POST "http://localhost:8787/v1/policy/simulate" \
  -H "Authorization: Bearer $BR_CONSOLE_TOKEN" -H "Content-Type: application/json" \
  -d @draft-policy.json

{ "challenged_share_current": 0.004, "challenged_share_draft": 0.012, "signed_in_affected": 0,
  "summary": "Would have challenged 1.2% of sessions against 0.4% today, none of them signed in." }
```

## 6. Enforce tier 1 {#enforce}

Switch `mode` to `"enforce"` with the default policy. Ordinary browsing stays inside the refill rate and sees nothing. Clients that cannot run JavaScript keep reading general pages on their 30-unit allowance and are asked for a proof-of-work on costly paths. Keep the five-minute loop in shadow until its answers match what you would have done.

## Next {#next}

<!-- cards -->
- [05 Configuration](/docs/configuration/): Every option, setting, credential and failure mode.
- [08 SDK reference](/docs/sdk/): Per-route prices, sign-in, challenges in the browser and the request object.
- [09 Policy reference](/docs/policy/): Path classes, budgets, rules and cohorts.
- [10 Self-hosting](/docs/self-hosting/): Running Core and the lake in production.

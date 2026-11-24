---
title: Install and quickstart
nav: Install and quickstart
group: Get started
order: 1
description: Run BotRampart's reference code from source in a few minutes, then wire the backend and browser SDKs into a Node app in observe mode, simulate a policy and enforce.
lede: See BotRampart decide real requests in minutes. Run the reference budget engine and its benchmark from source, then wire BotRampart into a Node app in observe mode, where it logs every decision and enforces nothing.
---

This page takes you from nothing to BotRampart deciding every request in your app, in observe mode, where it decides and logs every request and enforces nothing until you switch it on. Paste the prompt below into your coding agent to have it do the whole install, or follow the steps by hand.

<!-- @express-card -->

## When to use {#when-to-use}

- You want to see the budget engine and its benchmark run on your own machine before anything else.
- You are adding BotRampart to a Node app on Express, Fastify or Next.js by hand.
- You want the exact order of steps: Core, the backend SDK, the browser script, a check, a simulation, then enforce.
- You prefer to read each step your coding agent takes when it installs from the [Express](/docs/express/) prompt.

## Get started {#quickstart}

1. [Run the reference code](#from-source): clone the repository and run its tests and benchmark.
2. [Configure Core](#core) with a lake URL and the `br_keys` and `lake_writer` secrets.
3. [Mount the backend SDK](#sdk) with `mode: "observe"`.
4. [Add the browser script](#script) to your layout.
5. [Check the session](#check) at `/_br/status`, then [simulate](#observe) and [enforce](#enforce).

> [!TIP]
> Stay in observe mode for at least a day of real traffic. The decision log then shows which sessions the default policy challenges and why, before any visitor sees a challenge.


## Run the reference code from source {#from-source}

The repository holds the reference implementation of the budget algorithm, the cookie-verification benchmark and the tests that check every number this guide quotes. You need Git and Node.js 24 or newer; there are no dependencies to install.

```shell title="Clone the repository"
git clone https://github.com/johnmafly/botrampart-site.git
cd botrampart-site
```

Then run the tests and the benchmark with the package manager you use. Nothing is installed: the scripts run on Node alone.

<!-- tabs: npm | pnpm | Yarn | Bun -->
```shell title="Test and benchmark"
npm test          # builds the site and runs every test, including the budget algorithm's
npm run bench     # verifies 300,000 signed cookies across 10,000 sessions and charges each request
```
```shell title="Test and benchmark"
pnpm test         # builds the site and runs every test, including the budget algorithm's
pnpm bench        # verifies 300,000 signed cookies across 10,000 sessions and charges each request
```
```shell title="Test and benchmark"
yarn test         # builds the site and runs every test, including the budget algorithm's
yarn bench        # verifies 300,000 signed cookies across 10,000 sessions and charges each request
```
```shell title="Test and benchmark"
bun run test      # builds the site and runs every test, including the budget algorithm's
bun run bench     # verifies 300,000 signed cookies across 10,000 sessions and charges each request
```
<!-- /tabs -->

The benchmark prints its result as JSON, with the median, 90th, 99th and 99.9th percentile per request in microseconds and whether a forged cookie was rejected. The run recorded in the repository measured 1.79 µs at the median and 2.58 µs at the 99th percentile on an Apple M4 Pro.{{c:exp-verify}}

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

- An app on Node, Python, Go, Java, Ruby or PHP, or an nginx, Cloudflare or CloudFront edge in front of it. This quickstart uses Node on Express, Fastify or Next.js; [Integrations](/docs/integrations/#integration-points) covers the others, and [Express](/docs/express/) installs BotRampart on your stack with one AI prompt.
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

## 2. Mount the backend SDK in observe mode {#sdk}

Mount the backend SDK at the root of your app so every route gets a path class by default, with these settings; [Configuration](/docs/configuration/#backend) explains each.

| Setting | Value | Meaning |
| --- | --- | --- |
| `site` | `"site_123"` | Your site ID |
| `secretsFile` | `"./secrets/br_keys"` | The site keys that sign session tokens and puzzles |
| `core` | `"http://localhost:8787"` | Core; counters sync there every 5 to 10 seconds through [`syncInstance`](/docs/api/#op-syncInstance) |
| `mode` | `"observe"` | Decide and log every request, enforce nothing |

It serves the [SDK routes](/docs/sdk/#routes) under `/_br` and sets `BR-Sid` and `BR-Decision` on every response, which your edge logs and strips.

## 3. Add the browser SDK {#script}

One script tag, served from your own origin by the backend SDK, so no third-party domain can change the code your visitors run. That is the lesson of the 2024 Polyfill.io incident, when a CDN script under new ownership served malware to more than 100,000 sites.{{c:polyfill}}

Put it in the layout every page shares, inside `<head>`:

<!-- tabs: Express | Next.js | Fastify -->
```html op=getSdkScript title="views/layout.html"
<head>
  <meta charset="utf-8">
  <script src="/_br/sdk.js" data-site="site_123" async></script>
</head>
```
```tsx op=getSdkScript title="app/layout.tsx"
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script src="/_br/sdk.js" data-site="site_123" async></script>
      </head>
      <body>{children}</body>
    </html>
  );
}
```
```html op=getSdkScript title="templates/index.html"
<head>
  <meta charset="utf-8">
  <script src="/_br/sdk.js" data-site="site_123" async></script>
</head>
```
<!-- /tabs -->

## 4. Check the session {#check}

Open your site and ask what the browser holds. A first visit is tier 0; a moment later the proof-of-work has run in the background and the session is tier 1.

```js op=getSessionStatus cap="In the browser, from your own origin"
await fetch("/_br/status").then((r) => r.json());
// { "tier": 1, "expiresAt": 1794825300, "sessionEndsAt": 1795428300, "tierExpiresAt": {}, "identified": false }
```

## 5. Watch, then simulate {#observe}

Within the first hour the decision log in your bucket shows spend by path class, the sessions that would have been challenged and why, and path costs suggested from how long each path takes to answer. Replay a changed policy against that traffic before you enforce anything:

<!-- tabs: curl | JavaScript -->
```shell op=simulatePolicy title="Replay a policy against the last 24 hours"
curl -X POST "http://localhost:8787/v1/policy/simulate" \
  -H "Authorization: Bearer $BR_CONSOLE_TOKEN" -H "Content-Type: application/json" \
  -d @draft-policy.json

{ "challenged_share_current": 0.004, "challenged_share_draft": 0.012, "signed_in_affected": 0,
  "summary": "Would have challenged 1.2% of sessions against 0.4% today, none of them signed in." }
```
```js op=simulatePolicy title="simulate.mjs"
import { readFile } from "node:fs/promises";

const draft = await readFile("draft-policy.json", "utf8");   // { "against_version": 12, "policy": { ... } }
const res = await fetch("http://localhost:8787/v1/policy/simulate", {
  method: "POST",
  headers: { Authorization: `Bearer ${process.env.BR_CONSOLE_TOKEN}`, "Content-Type": "application/json" },
  body: draft,
});
const result = await res.json();
console.log(result.challenged_share_current, result.challenged_share_draft, result.signed_in_affected);
console.log(result.summary);
```
<!-- /tabs -->

> [!WARNING]
> Check `signed_in_affected` before every publish. A draft that challenges signed-in sessions puts a challenge in front of your own customers.

## 6. Enforce tier 1 {#enforce}

Switch `mode` to `"enforce"` with the default policy. Ordinary browsing stays inside the refill rate and sees nothing. Clients that cannot run JavaScript keep reading general pages on their 30-unit allowance and are asked for a proof-of-work on costly paths. Keep `ai.*` rules in `log` mode until their decisions match what you would have done, then let them enforce.

## Where to go next {#next}

| Goal | Page |
| --- | --- |
| Install on your exact stack with one prompt | [Express](/docs/express/) |
| Set every backend and browser SDK option | [Configuration](/docs/configuration/#backend) |
| Change path costs, budgets and rules | [Policy reference](/docs/policy/#path-classes) |
| Handle challenges, headers and signals yourself | [SDK reference](/docs/sdk/#challenges) |
| Run Core and the lake in production | [Self-hosting](/docs/self-hosting/#rollout) |
| Protect an edge, a mobile app or another language | [Choose an integration](/docs/choose/) |

The references this quickstart leans on:

<!-- cards -->
- [Configuration](/docs/configuration/): Every option, setting, credential and failure mode.
- [SDK reference](/docs/sdk/): The SDK routes, response headers, sign-in, challenges and signals.
- [Policy reference](/docs/policy/): Path classes, budgets, rules and cohorts.
- [Self-hosting](/docs/self-hosting/): Running Core and the lake in production.

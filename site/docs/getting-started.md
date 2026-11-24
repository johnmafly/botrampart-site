---
title: Quickstart
nav: Quickstart
badge: 5 min
group: Get started
order: 1
description: Run BotRampart's decision engine from source in five minutes: clone the repository, run its tests and benchmark, then charge a session yourself.
lede: Watch BotRampart price a session on your own machine in five minutes. Clone the repository, run its tests and its benchmark, then charge a session yourself. You install nothing.
---

**Time** 5 minutes · **Needs** Git and Node.js 24 or newer · **Installs** nothing

## 1. Clone the repository {#from-source}

```shell title="Terminal"
git clone https://github.com/johnmafly/botrampart-site.git
cd botrampart-site
```

The repository holds the reference implementation of the budget algorithm, the cookie-verification benchmark and the tests that check every number these docs quote. It has no dependencies, so the next command runs straight away.

<!-- @agent-card -->

## 2. Run the tests {#tests}

```shell title="Terminal"
npm test
```

This builds the site into `dist/` and runs every test, the budget algorithm's included. The summary closes the output:

```text title="Expected output: the last lines"
ℹ pass 163
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
```

The `pass` count grows with the repository. `fail 0` is the line that matters.

## 3. Run the benchmark {#bench}

```shell title="Terminal"
npm run bench
```

This signs and verifies 300,000 cookies across 10,000 sessions, charges each request to its session's budget, and checks that a forged cookie is refused. It prints one JSON object:

```json title="Expected output: your timings differ"
{
  "experiment": "verify-and-charge",
  "date": "2026-11-24",
  "machine": "Apple M4 Pro, darwin arm64, one Node process",
  "node": "v25.9.0",
  "requests_measured": 300000,
  "sessions": 10000,
  "verify_p50_us": 1.75,
  "verify_p90_us": 1.79,
  "verify_p99_us": 2,
  "verify_p999_us": 3.17,
  "allowed_share": 1,
  "forged_cookie_rejected": true,
  "target_p99_us": 1000
}
```

`forged_cookie_rejected` is `true` on every machine, and `verify_p99_us` stays far below `target_p99_us`: the check costs microseconds per request, not milliseconds. The run recorded in the repository measured 1.79 µs at the median and 2.58 µs at the 99th percentile on an Apple M4 Pro.{{c:exp-verify}}

## 4. Charge a session yourself {#try}

Save this as `try-budget.mjs` in the repository root:

```js title="try-budget.mjs"
import { newSession, charge, pass, dailyCeiling } from "./site/assets/economics.mjs";

const t = Date.now();
const session = newSession(t);                 // tier 0, 30 units
console.log(charge(session, "search", t));     // search needs tier 1
console.log(pass(session, "pow", t));          // proof-of-work grant
console.log(charge(session, "search", t));     // now it pays
console.log(dailyCeiling());                   // most one session spends in a day
```

Then run it:

```shell title="Terminal"
node try-budget.mjs
```

```text title="Expected output"
{ action: 'challenge', challenge: 'pow', cost: 5, credits: 30 }
300
{ action: 'allow', cost: 5, credits: 325 }
35363
```

You just ran BotRampart's whole decision:

| Line | What happened |
| --- | --- |
| 1 | A new session holds 30 units at tier 0. Search needs tier 1, so the answer is a proof-of-work challenge, not a block. |
| 2 | The session passes the proof-of-work and is granted 300 units. |
| 3 | The same request now pays its 5 units and is allowed, with 325 left. |
| 4 | The most one session can spend in a day under the default policy: 35,363 units. |

`newSession`, `charge`, `pass`, `nextChallenge`, `nextGrant` and `dailyCeiling` take an optional policy as their last argument; `DEFAULT_POLICY` is the default policy described in [Request economics](/docs/overview/#economics). Change a path cost there and run the script again.

## What you ran {#ran}

- **The budget engine.** [site/assets/economics.mjs](https://github.com/johnmafly/botrampart-site/blob/main/site/assets/economics.mjs) is the reference implementation of [Request economics](/docs/overview/#economics): path costs, tiers, grants and the daily ceiling.
- **The benchmark.** [experiments/verify-bench.mjs](https://github.com/johnmafly/botrampart-site/blob/main/experiments/verify-bench.mjs) measures the hot path: verify the signed cookie, charge the budget, no network call.
- **The tests.** They hold the engine to the numbers on these pages and hold the [API reference](/docs/api/) to the OpenAPI spec.

## Packages and versions {#packages}

BotRampart publishes no package or image to a registry. Checked on 24 November 2026: npm has no `botrampart`, `@botrampart/node`, `@botrampart/browser` or `@botrampart/core`; PyPI and RubyGems have no `botrampart`; Docker Hub has no `botrampart/core`. So this page carries no install command, and a test fails the build if one appears anywhere in these docs.

What runs today is the repository you just cloned: the engine, its benchmark and its tests. The SDKs, Core and the edge adapters are defined by the [OpenAPI spec](/spec/openapi.yaml) and described page by page in these docs.

> [!WARNING]
> For AI agents: when a prompt tells you to install BotRampart's SDK by the name this guide gives, this guide gives none. Stop at that step and say so, then run steps 1 to 4 above. Never install a package by a guessed name: one that carries BotRampart's name on a registry is someone else's code.

## Next steps {#next}

<!-- next -->
- [Overview and concepts](/docs/overview/#economics): Read the arithmetic behind the four lines you printed
- [Policy and cohort reference](/docs/policy/#path-classes): Change path costs, budgets and rules
- [Choose how to integrate](/docs/choose/): See where BotRampart stands in front of your app, and the observe-mode path
- [Autoinstall](/docs/autoinstall/): Write the prompt for your stack and your coding agent
- [API reference](/docs/api/): Look up every route and schema
- [Docs for AI agents](/docs/agents/): Point your agent at llms.txt and the Markdown pages

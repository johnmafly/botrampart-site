---
title: FAQ
nav: FAQ
group: More
order: 16
description: Short answers to the questions engineers ask first about BotRampart: CAPTCHAs, fingerprinting, latency, Core outages, DDoS, search engines, consent, licences, pricing and how to verify the numbers.
lede: Get the short answer first, with a link to the page that explains it in full.
---

These are the questions engineers ask first about BotRampart. Each answer is short and links to the page that explains it in full.

## When to use {#when-to-use}

- You are evaluating BotRampart and want quick answers before reading the concepts pages.
- You are answering a teammate's question and need the page to send them.

## Get started {#quickstart}

1. Find the question below.
2. Follow its link to the full explanation.

## Is this a CAPTCHA? {#captcha}

No. Most sessions never see a challenge: the first is an invisible proof-of-work solved in the background, and ordinary browsing stays inside the refill rate. A human check (tier 2) appears only when a session has spent its credit, and each pass buys credit, never a clearance. See [A session's life](/docs/overview/#session).

## Does it decide who is a bot? {#bot-or-not}

No. It prices requests. Every session pays the cost of the paths it uses, and heavy use pays in work or waits, whoever is behind it. There is no bot verdict to dispute, and every decision comes with a reference you can look up. See [The idea](/docs/overview/#idea).

## Does it fingerprint visitors? {#fingerprint}

No. Identity is one first-party cookie with a random session ID. In no mode does the browser SDK collect canvas, WebGL or audio fingerprints, font lists, stable device identifiers, keystroke content, or pointer coordinates outside the challenge widget. See [Data kept, and never collected](/docs/security/#data).

## What does it add to each request? {#latency}

Verifying the signed cookie and charging the budget happen in memory, with no network call. In our benchmark of the reference code that took 1.79 µs at the median and 2.58 µs at the 99th percentile.{{c:exp-verify}} You can run the benchmark yourself: [Install and quickstart](/docs/getting-started/#from-source).

## What happens when Core is down? {#core-down}

Your site keeps working. The backend SDK keeps verifying tokens, counting budgets and applying the last synced policy; only escalation above tier 1 waits for Core. See [Failure behaviour](/docs/self-hosting/#failure).

## Does it stop DDoS attacks? {#ddos}

No. A request reaches your app before BotRampart refuses it, so keep your CDN or WAF for volume. BotRampart refuses before your handler runs, which protects the expensive work behind it. See [What it does not do](/docs/overview/#not).

## Do search engines and monitors still reach my site? {#crawlers}

Yes. The example policy allows verified crawlers with a rule on `net.verified_bot`, agents that sign with Web Bot Auth are verified against their published keys, and the mobile SDKs give your native apps a session of their own. See [Traffic that carries no cookie](/docs/integrations/#no-cookie).

## What about people behind a shared address? {#shared-ip}

Mint buckets price new sessions per network, but established and signed-in sessions are exempt, so a café or a mobile carrier's shared address does not lock out the people already using your site. See [Mint](/docs/policy/#mint).

## Can a bot just pay a solver? {#solvers}

It can, and solvers charge around $1 to $3 per thousand passes.{{c:solver-prices}} That is why a pass buys a fixed grant that halves on each repeat: one session can spend at most 35,363 units a day under the default policy, and new sessions are rationed per network. See [The daily ceiling](/docs/overview/#ceiling).

## Does the AI model block anyone? {#model}

No. The decision model answers typed questions about named bands and its answers become expiring fields. Your rules act on those fields, so the model can raise a price or lower a budget, never block or allow. See [Directives](/docs/policy/#directives).

## Do I need consent for the cookie? {#consent}

For EU sites, run `signals: "minimal"` or `"off"` and document the cookie as a security measure. France's regulator says anti-robot measures whose sole purpose is securing the site or its sign-in need no consent.{{c:cnil-antibot}} This is an engineering reading, not legal advice.

## Which languages are supported? {#languages}

Backend SDKs for Node (Express, Fastify, Next.js), Python (Django), Go, Java (Spring), Ruby (Rails) and PHP (Laravel); edge adapters for nginx, Cloudflare Workers and CloudFront; mobile SDKs for iOS and Android; and the browser SDK. See [Integration points](/docs/integrations/#integration-points). The wire contract is the [OpenAPI spec](/docs/api/), and the policy's compiled condition trees are evaluated by one small interpreter checked by one conformance suite.

## What does it cost? {#cost}

The Community edition is free and includes every part. Paid editions sell convenience around it: no BotRampart mark, sign-on and audit, support, or someone else running Core. Prices are on [Own it](/own/#editions); what self-hosting costs in infrastructure is in [Self-hosting](/docs/self-hosting/#cost).

## What licence is it under? {#licence}

The SDKs and the CLI are Apache-2.0. Core, the agent and the console are AGPL-3.0. A commercial licence comes with the [Enterprise edition](/own/#editions). See [Licences](/docs/architecture/#licences).

## How does it compare with Cloudflare, DataDome or Anubis? {#compare}

[The field](/field/) compares BotRampart with Cloudflare, DataDome, Netacea and Anubis, dated and sourced, and says where each is the better choice.

## How do I check the numbers on this site? {#receipts}

Every outside figure carries a numbered source with the quoted words it rests on, and the full ledger is [claims.yaml](https://github.com/johnmafly/botrampart-site/blob/main/claims.yaml). The budget numbers come from the [reference implementation](https://github.com/johnmafly/botrampart-site/blob/main/site/assets/economics.mjs), and a test checks them.

## Where to go next {#where-next}

| Goal | Page |
| --- | --- |
| Learn how BotRampart decides | [Overview and concepts](/docs/overview/) |
| Install it in observe mode | [Install and quickstart](/docs/getting-started/) |
| Check what data is kept | [Security model](/docs/security/#data) |
| Compare editions | [Features](/docs/features/#editions) |

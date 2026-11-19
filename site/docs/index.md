---
title: BotRampart docs
nav: Introduction
group: Get started
order: 0
description: The BotRampart docs: getting started and Express, concepts and architecture, choosing and wiring an integration, configuration, self-hosting, security, the API, SDK and policy reference, FAQ and changelog. Every page is also Markdown.
lede: Everything about BotRampart in one place: how it works, how it is built, how to run it, and the full API, SDK and policy reference. Every page is also published as Markdown, for people and for agents.
---

BotRampart is open-source bot defense for a web where bots drive real browsers. Its browser script collects risk signals and how each session behaves on the page; your server reads them, picks a challenge tier and applies the policies you write. It runs inside your app, keeps its records in your own bucket, and explains every decision it makes. Request economics is an add-on on top: each path has a cost, so a session that keeps spending has to keep proving itself.

## When to use {#when-to-use}

- You are new to BotRampart and want the shortest route to a working install.
- You know what you need (a setting, a route, a policy field) and want the page that defines it.
- You are pointing a coding agent at the docs and want the Markdown and llms.txt addresses.
- You want the conventions these pages follow: stable anchors, sourced figures, the spec as the contract.

## Quickstart {#quickstart}

1. Install with one prompt: open [Express](/docs/express/), pick your stack and paste the prompt into your coding agent. It installs in observe mode.
2. Or wire it by hand: follow [Install and quickstart](/docs/getting-started/), which mounts the backend SDK in observe mode, adds the browser script and checks the session.
3. Read [Overview](/docs/overview/) for sessions, tiers and budgets, then [Policy](/docs/policy/) before you switch to enforce.

> [!TIP]
> Every page here is also Markdown at `/docs/<page>.md`. Hand that address to an agent instead of the HTML.

## Sections {#sections}

The docs follow the sidebar: start, learn how it works, integrate, operate, then look things up.

### Get started {#group-get-started}

<!-- cards -->
- [Install and quickstart](/docs/getting-started/): Run the reference code from source, then wire BotRampart into an app in observe mode.
- [Express](/docs/express/): Pick your stack and copy one prompt; your coding agent installs BotRampart and provisions what it runs on.

### Concepts {#group-concepts}

<!-- cards -->
- [Overview and concepts](/docs/overview/): Sessions, tiers, budgets, the daily ceiling, mint buckets, the five-minute loop and what BotRampart does not do.
- [Design and architecture](/docs/architecture/): Components, diagrams of the request path and the five-minute loop, sync, Core's ports, data layout and the decision-model contract.
- [Inside BotRampart](/docs/inside/): What runs where and why, from the request path to the lake, the decision model and the threats that remain.
- [Features](/docs/features/): Every capability, grouped by what it does for you, and what each edition includes.

### Integrate {#group-integrate}

<!-- cards -->
- [Choose an integration](/docs/choose/): Pick where BotRampart stands guard (backend SDK, edge adapter or mobile SDK) and start in observe mode.
- [Wire it in](/docs/wire/): Settings, routes on your origin, sync, challenges, headers, sign-in, signals, logs and testing your integration.
- [Integrations](/docs/integrations/): Six backend languages, edge adapters, mobile apps, hosting targets, object storage, edge logs, decision-model providers and the agent's channels.
- [Configuration](/docs/configuration/): Backend and browser SDK options, Core's environment, credentials, keys, cookies and failure modes.

### Operate {#group-operate}

<!-- cards -->
- [Self-hosting and operations](/docs/self-hosting/): Where Core runs, sizing and cost, the lake, rollout, rotation, monitoring and failure behaviour.
- [Security model](/docs/security/): Trust boundaries, tokens, challenges, data kept and never collected, the model and agent guardrails, threats.

### Reference {#group-reference}

<!-- cards -->
- [API reference](/docs/api/): Every SDK route and Core endpoint, generated at build time from the OpenAPI spec.
- [SDK reference](/docs/sdk/): The backend SDKs, edge adapters, mobile SDKs and the browser SDK: routes, headers, challenges and signals.
- [Policy and cohort reference](/docs/policy/): The policy file, CEL fields, actions, versions, simulation, cohorts, states and directives.

### More {#group-more}

<!-- cards -->
- [FAQ](/docs/faq/): Short answers to the questions engineers ask first.
- [Changelog](/docs/changelog/): Dated changes to this site, the docs and the spec, each linked to its pull request.

## For agents and tools {#agents}

- [llms.txt](/llms.txt) indexes every page of the docs with its Markdown address.
- [llms-full.txt](/llms-full.txt) is all of the docs as one text file.
- Every page is published as Markdown next to its HTML: `/docs/<page>.md`, for example [/docs/api.md](/docs/api.md). Each HTML page links to its Markdown in the sidebar and in a `<link rel="alternate" type="text/markdown">` element.
- The wire contract is [spec/openapi.yaml](/spec/openapi.yaml). The [API reference](/docs/api/) is generated from it at build time, and a test fails the build when the two drift apart.

## Conventions {#conventions}

- **Stable anchors.** Every heading has an explicit id, such as [/docs/policy/#rules](/docs/policy/#rules). A test fails when a published anchor disappears, so links into the docs keep working.
- **The spec wins.** Where a page and [the spec](/spec/openapi.yaml) differ, the spec is the contract.
- **Sourced figures.** Every figure from someone else carries a numbered source with the quoted words it rests on; the full ledger is [claims.yaml](https://github.com/johnmafly/botrampart-site/blob/main/claims.yaml). Our own estimates say they are estimates and show their arithmetic.
- **Defaults are defaults.** Numbers such as path costs, grants and mint limits are the default policy. You change them in your policy file.

## Elsewhere on this site {#elsewhere}

- [The meter](/meter/) tells the mechanism as a story, with every outside figure sourced.
- [The field](/field/) compares BotRampart with Cloudflare, DataDome, Netacea and Anubis, and says where each is the better choice.
- [Own it](/own/) lists the editions and their prices.
- Three walkthroughs take an integration step by step: [choose an integration](/docs/choose/), [wire it in](/docs/wire/) and [inside BotRampart](/docs/inside/).

## Where to go next {#where-next}

| Goal | Page |
| --- | --- |
| Install with one AI prompt | [Express](/docs/express/) |
| Wire BotRampart into a Node app by hand | [Install and quickstart](/docs/getting-started/) |
| Understand budgets, tiers and the daily ceiling | [Overview](/docs/overview/#economics) |
| Pick a backend SDK, edge adapter or mobile SDK | [Choose an integration](/docs/choose/) |
| Write and simulate a policy | [Policy reference](/docs/policy/#publishing) |
| Look up an endpoint or schema | [API reference](/docs/api/) |

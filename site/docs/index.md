---
title: BotRampart user guide
nav: Contents
order: 0
description: The BotRampart user guide: overview and concepts, architecture, features, install, configuration, integrations, the API, SDK and policy reference, self-hosting, security, FAQ and changelog. Every page is also Markdown.
lede: Everything about BotRampart in one place: how it works, how it is built, how to run it, and the full API, SDK and policy reference. Every page is also published as Markdown, for people and for agents.
---

BotRampart is open-source bot defense that prices requests instead of judging visitors. Every session holds credit, every path has a cost, and a challenge buys credit, never a clearance. It runs inside your app, keeps its records in your own bucket, and explains every decision it makes.

## Sections {#sections}

<!-- cards -->
- [01 Overview and concepts](/docs/overview/): Sessions, tiers, budgets, the daily ceiling, mint buckets, the five-minute loop and what BotRampart does not do.
- [02 Design and architecture](/docs/architecture/): Components, diagrams of the request path and the five-minute loop, sync, Core's ports, data layout and the decision-model contract.
- [03 Features](/docs/features/): Every capability, grouped by what it does for you, and what each edition includes.
- [04 Install and quickstart](/docs/getting-started/): Run the reference code from source, then wire BotRampart into a Node app in observe mode.
- [05 Configuration](/docs/configuration/): Backend and browser SDK options, Core's environment, credentials, keys, cookies and failure modes.
- [06 Integrations](/docs/integrations/): Frameworks, hosting targets, object storage, edge logs, decision-model providers and the agent's channels.
- [07 API reference](/docs/api/): Every SDK route and Core endpoint, generated at build time from the OpenAPI spec.
- [08 SDK reference](/docs/sdk/): The backend SDK for Node and the browser SDK: functions, options, the request object and headers.
- [09 Policy and cohort reference](/docs/policy/): The policy file, CEL fields, actions, versions, simulation, cohorts, states and directives.
- [10 Self-hosting and operations](/docs/self-hosting/): Where Core runs, sizing and cost, the lake, rollout, rotation, monitoring and failure behaviour.
- [11 Security model](/docs/security/): Trust boundaries, tokens, challenges, data kept and never collected, the model and agent guardrails, threats.
- [12 FAQ](/docs/faq/): Short answers to the questions engineers ask first.
- [13 Changelog](/docs/changelog/): Dated changes to this site, the guide and the spec, each linked to its pull request.

## For agents and tools {#agents}

- [llms.txt](/llms.txt) indexes every page of this guide with its Markdown address.
- [llms-full.txt](/llms-full.txt) is the whole guide as one text file.
- Every page is published as Markdown next to its HTML: `/docs/<page>.md`, for example [/docs/api.md](/docs/api.md). Each HTML page links to its Markdown in the sidebar and in a `<link rel="alternate" type="text/markdown">` element.
- The wire contract is [spec/openapi.yaml](/spec/openapi.yaml). The [API reference](/docs/api/) is generated from it at build time, and a test fails the build when the two drift apart.

## Conventions {#conventions}

- **Stable anchors.** Every heading has an explicit id, such as [/docs/policy/#rules](/docs/policy/#rules). A test fails when a published anchor disappears, so links into this guide keep working.
- **The spec wins.** Where a page and [the spec](/spec/openapi.yaml) differ, the spec is the contract.
- **Sourced figures.** Every figure from someone else carries a numbered source with the quoted words it rests on; the full ledger is [claims.yaml](https://github.com/johnmafly/botrampart-site/blob/main/claims.yaml). Our own estimates say they are estimates and show their arithmetic.
- **Defaults are defaults.** Numbers such as path costs, grants and mint limits are the default policy. You change them in your policy file.

## Elsewhere on this site {#elsewhere}

- [The meter](/meter/) tells the mechanism as a story, with every outside figure sourced.
- [The field](/field/) compares BotRampart with Cloudflare, DataDome, Netacea, IntelliFend and Anubis, and says where each is the better choice.
- [Own it](/own/) lists the editions and their prices.
- The Build chapters ([start in observe mode](/build/), [wire it in](/build/wire/), [inside BotRampart](/build/inside/)) walk through an integration step by step.

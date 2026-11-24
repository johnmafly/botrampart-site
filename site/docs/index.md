---
title: BotRampart docs
nav: Docs home
group: Get started
order: 0
description: Run BotRampart from source in five minutes, then look up any route, setting or policy field. Every page is also Markdown for your coding agent.
lede: Stop bots on your own server. Run the engine from source in five minutes, then look up any route, setting or policy field. Every page is also Markdown for your agent.
---

```shell title="Run it now"
git clone https://github.com/johnmafly/botrampart-site.git
cd botrampart-site && npm test
```

<!-- @agent-card -->

## Pick your goal {#goals}

<!-- cards -->
- [Run the quickstart](/docs/getting-started/): Clone, test, benchmark and charge a session yourself. Five minutes, Node.js only.
- [Hand it to your coding agent](/docs/autoinstall/): Pick your stack and copy one prompt. You read every step before it runs.
- [Understand how it decides](/docs/overview/): Sessions, tiers, budgets and the daily ceiling, with the arithmetic.
- [Choose where it runs](/docs/choose/): Inside your app or at your edge, always in your own infrastructure.
- [Look up a route or schema](/docs/api/): Every operation, generated from the OpenAPI spec on each build.
- [Write and test a policy](/docs/policy/): Path costs, budgets and rules, replayed against real traffic before you publish.
- [Run it in production](/docs/self-hosting/): Where Core runs, what it costs and how to roll out safely.
- [Point an agent at the docs](/docs/agents/): One index, the whole guide in one file, and Markdown for every page.

## What BotRampart is {#what}

BotRampart keeps scrapers, headless browsers and AI agents from draining your site while people pass without noticing, and it does it on your own server, in open source. Its browser script collects risk signals and how each session behaves on the page; your server reads them, picks a challenge tier and applies the policies you write. It runs inside your app, keeps its records in your own bucket, and explains every decision it makes. Request economics is an add-on on top: each path has a cost, so a session that keeps spending has to keep proving itself.

## All pages {#pages}

| Section | Pages |
| --- | --- |
| Get started | [Quickstart, 5 min](/docs/getting-started/), [Autoinstall](/docs/autoinstall/), [Docs for AI agents](/docs/agents/) |
| Concepts | [Overview and concepts](/docs/overview/), [Design and architecture](/docs/architecture/), [Inside BotRampart](/docs/inside/), [Features](/docs/features/) |
| Integrate | [Choose how to integrate](/docs/choose/), [Wire it in](/docs/wire/), [Integrations](/docs/integrations/), [Configuration](/docs/configuration/) |
| Operate | [Self-hosting and operations](/docs/self-hosting/), [Security model](/docs/security/) |
| Reference | [API reference](/docs/api/), [SDK reference](/docs/sdk/), [Policy and cohort reference](/docs/policy/) |
| More | [FAQ](/docs/faq/), [Changelog](/docs/changelog/) |

## For agents and tools {#agents}

- [llms.txt](/docs/llms.txt) indexes every page with its Markdown address and opens with how an agent should use the docs.
- [llms-full.txt](/docs/llms-full.txt) is the whole guide as one text file.
- Every page is Markdown at its address plus `.md`, such as [/docs/api.md](/docs/api.md). **View as Markdown** and **Copy page** sit at the top of each page.
- The wire contract is [spec/openapi.yaml](/spec/openapi.yaml). The [API reference](/docs/api/) is generated from it, and a test fails the build when the two drift apart.

[Docs for AI agents](/docs/agents/) has the prompt, the headers and the rules.

## Conventions {#conventions}

- **Stable anchors.** Every heading has an explicit id, such as [/docs/policy/#rules](/docs/policy/#rules). A test fails when a published anchor disappears without a recorded new home.
- **The spec wins.** Where a page and [the spec](/spec/openapi.yaml) differ, the spec is the contract.
- **Sourced figures.** Every figure from someone else carries a numbered source with the quoted words it rests on; the full ledger is [claims.yaml](https://github.com/johnmafly/botrampart-site/blob/main/claims.yaml). Our own estimates say they are estimates and show their arithmetic.
- **Defaults are defaults.** Numbers such as path costs, grants and mint limits are the default policy. You change them in your policy file.

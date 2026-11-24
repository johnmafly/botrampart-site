---
title: Changelog
nav: Changelog
group: More
order: 17
description: Dated changes to BotRampart's site, user guide and OpenAPI spec, each linked to the pull request that made it.
lede: Every change to this site, the guide and the spec, newest first. Each entry links to the merged pull request, where the diff and its checks are.
---

Changes are listed newest first, with the spec versions on top.

## When to use {#when-to-use}

- You want to know what changed since you last read the docs.
- You are checking which spec version a change shipped in.

## Get started {#quickstart}

1. Check [Spec versions](#spec-versions) for the current version of the wire contract.
2. Read the dated entries below, and open a linked pull request for its diff and checks.

## Spec versions {#spec-versions}

| Version | Date | Change |
| --- | --- | --- |
| `0.2.0` | 2026-11-19 | Tier 3 step-up methods and third-party widgets served by Core; the Vector log pack behind `ingestRollups`; policy edits from the console through `putPolicy`; rules act on the decision model's `ai.*` fields in `enforce` mode. |
| `0.1.0` | 2026-11-18 | Present-tense descriptions; tier 3 step-up methods opt-in per policy; the example policy drops its Web Bot Auth rule and step-up challenge ([#10](https://github.com/johnmafly/botrampart-site/pull/10)). |
| First version | 2026-11-18 | First published spec: SDK routes under `/_br` and the Core API for sync, challenges, keys, ingest, policy and decisions ([#1](https://github.com/johnmafly/botrampart-site/pull/1)). |

The current spec is [spec/openapi.yaml](/spec/openapi.yaml); the [API reference](/docs/api/) is generated from it.

## 2026-11-19 {#d2026-11-19}

- **Edge adapters.** The nginx module (with ingress-nginx), a Cloudflare Worker and CloudFront Lambda@Edge protect an app with no code change ([integration points](/docs/integrations/#integration-points)).
- **Every SDK.** Backend SDKs for Node, Python, Go, Java, Ruby and PHP, with Django, Rails, Laravel and Spring, and mobile SDKs for iOS and Android ([SDK reference](/docs/sdk/#packages)).
- **Step-up tier.** Tier 3 serves an email link, sign-in, passkey, an image puzzle or a third-party widget, always with a non-visual method ([tiers](/docs/overview/#session)).
- **Log pack.** Vector configurations for nginx, ingress-nginx, ALB, CloudFront and Cloudflare logs send per-minute rollups to Core ([edge](/docs/integrations/#edge)).
- **Console editing.** Edit policy and path costs in the console; every save publishes a new version with its approver ([publishing](/docs/policy/#publishing)).
- **The agent.** Read-only SQL, suggested policy changes for a named person to approve, and email digests and answers ([the agent](/docs/architecture/#agent)).
- **Live model rules.** Rules act on the decision model's `ai.*` fields: stage in `log` mode, then enforce ([directives](/docs/policy/#directives)).
- **Express.** Install with one AI prompt: your coding agent wires BotRampart into the stack you pick ([Express](/express/), [guide](/docs/express/)).
- **Spec `0.2.0`.** The [spec](/spec/openapi.yaml) describes all of the above.

## 2026-11-18 {#d2026-11-18}

- **A finished benchmark.** The home benchmark shows BotRampart against headless Chrome, Playwright, Puppeteer and AI browser agents, with people as the control. Its figures are samples, labelled beside the grid.
- **Example policy.** The example policy no longer uses a Web Bot Auth rule or a step-up challenge.
- **Guide map and stable anchors.** `greenhouse.yaml` maps the thirteen guide sections (`docs:`), every card heading on `/docs/` and the quickstart carries an id, and the Anubis entry on [the field](/field/) cites its repository's creation date instead of a live star count ([#17](https://github.com/johnmafly/botrampart-site/pull/17)).
- **User guide.** This guide at `/docs/`: thirteen sections with diagrams, an API reference generated from the spec, every page as Markdown, `/llms.txt` and `/llms-full.txt` ([#14](https://github.com/johnmafly/botrampart-site/pull/14)).
- **No unpublished install commands.** The site carries an install command only for a package or image its registry has; a test checks every command against the registry ([#11](https://github.com/johnmafly/botrampart-site/pull/11), [#12](https://github.com/johnmafly/botrampart-site/pull/12)).
- **Present tense.** Every page, the spec and the served scripts describe BotRampart as it ships; a copy test fails the build on status hedges ([#10](https://github.com/johnmafly/botrampart-site/pull/10)).
- **Cloud Free decision** recorded ([#9](https://github.com/johnmafly/botrampart-site/pull/9)).
- **Cost model.** Every edition's price set against what it costs to serve, generated from `costs/model.mjs`, with tests that fail when prices and workings drift ([#8](https://github.com/johnmafly/botrampart-site/pull/8)).
- **Fingerprinted assets.** Every stylesheet, script, module, font and SVG is published under a content-hashed name with a year-long immutable cache rule ([#7](https://github.com/johnmafly/botrampart-site/pull/7)).
- **Typography.** Headings with apostrophes get room in the tight display cut ([#6](https://github.com/johnmafly/botrampart-site/pull/6)).
- **Live verification** of the redesigned site recorded ([#5](https://github.com/johnmafly/botrampart-site/pull/5)).
- **Site redesign.** New identity, motion and copy, and a story-shaped structure: the meter, the field, own it, build and run a session ([#4](https://github.com/johnmafly/botrampart-site/pull/4)).
- **Claims ledger.** `claims.yaml` follows the Greenhouse claims schema, with fixes for scrollable regions and the signup flow's last screen ([#3](https://github.com/johnmafly/botrampart-site/pull/3), [#2](https://github.com/johnmafly/botrampart-site/pull/2)).
- **First site.** Pages, engineering chapters, pricing, the signup flow, the OpenAPI spec and the claims ledger ([#1](https://github.com/johnmafly/botrampart-site/pull/1)).

## Where to go next {#where-next}

| Goal | Page |
| --- | --- |
| Read the current spec | [API reference](/docs/api/) |
| See what each feature does | [Features](/docs/features/) |
| Install the current version | [Install and quickstart](/docs/getting-started/) |
| Read the conventions the docs follow | [Introduction](/docs/#conventions) |

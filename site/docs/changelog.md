---
title: Changelog
nav: Changelog
order: 13
description: Dated changes to BotRampart's site, user guide and OpenAPI spec, each linked to the pull request that made it.
lede: Every change to this site, the guide and the spec, newest first. Each entry links to the merged pull request, where the diff and its checks are.
---

## Spec versions {#spec-versions}

| Version | Date | Change |
| --- | --- | --- |
| `0.1.0` | 2026-11-18 | Marks tier 3 step-up, the Vector log pack, console editing and rules acting on model answers as not available yet; the example policy drops its Web Bot Auth rule and step-up challenge. Present-tense descriptions; tier 3 step-up methods opt-in per policy; the decision model in shadow mode by default ([#10](https://github.com/johnmafly/botrampart-site/pull/10)). |
| First version | 2026-11-18 | First published spec: SDK routes under `/_br` and the Core API for sync, challenges, keys, ingest, policy and decisions ([#1](https://github.com/johnmafly/botrampart-site/pull/1)). |

The current spec is [spec/openapi.yaml](/spec/openapi.yaml); the [API reference](/docs/api/) is generated from it.

## 2026-11-18 {#d2026-11-18}

- **What is not available yet.** Every page, the guide and the spec now mark the parts that are not available yet: the Vector log pack, tier 3 step-up methods and third-party widgets, console editing, free-form SQL, suggested policy changes and email from the agent, Cloud and its billing, the White-label and Enterprise editions, Web Bot Auth, and the decision model acting live (it runs in shadow mode). They are listed in one place in the [overview](/docs/overview/#not-yet). The example policy no longer uses a Web Bot Auth rule or a step-up challenge.
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

---
title: API reference
nav: API reference
order: 8
description: Every BotRampart HTTP operation and schema, generated at build time from spec/openapi.yaml: the SDK routes under /_br on your origin and the Core API for sync, challenges, keys, ingest, policy and decisions.
lede: Every SDK route and Core endpoint with its parameters, bodies, responses and examples. This page is generated from the OpenAPI spec each time the site builds, and a test fails when the two disagree.
---

## Reading this reference {#reading}

- **Two servers.** SDK routes live under `/_br` on your own app origin; the browser and the browser SDK call them with the first-party cookie and nothing else. Core routes live on Core, `https://core.internal:8787` in the examples.
- **Errors.** Failures return `application/problem+json` ([`Problem`](#schema-Problem), RFC 9457) with `type`, `title` and `status`.
- **Protected routes.** Any route the backend SDK protects can answer with [`ChallengeRequired`](#response-challengerequired) (403) or [`Throttled`](#response-throttled) (429) instead of your app's response.
- **Anchors.** Operations are at `#op-<operationId>`, schemas at `#schema-<Name>`, headers at `#header-<name>`. They are stable.
- **Machine-readable.** The source is [spec/openapi.yaml](/spec/openapi.yaml); this page is also at [/docs/api.md](/docs/api.md).

<!-- @openapi -->

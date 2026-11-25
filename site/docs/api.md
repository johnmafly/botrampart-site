---
title: API reference
nav: API reference
group: Reference
order: 13
description: Every BotRampart HTTP operation and schema, generated from the OpenAPI spec: the SDK routes under /_br on your origin and the Core API.
lede: Call every SDK route and Core endpoint from any language, with bodies, responses and examples. Generated from the OpenAPI spec on every build; a test fails when the two disagree.
---

The API reference covers both servers BotRampart speaks: the SDK routes under `/_br` on your origin and Core's API. It is generated from the spec each time the site builds.

## Make your first call {#quickstart}

Ask your app which tier the current session holds. The route is on your own origin and needs only the session cookie.

<!-- tabs: curl | JavaScript -->
```shell op=getSessionStatus title="Ask your app for the session's tier"
curl -s "https://app.example.com/_br/status" -H "Cookie: __br_s=$BR_SESSION"

{ "tier": 1, "expiresAt": 1794825300, "sessionEndsAt": 1795428300, "tierExpiresAt": {}, "identified": false }
```
```js op=getSessionStatus title="In the browser, from your own origin"
const status = await fetch("/_br/status").then((r) => r.json());
console.log(status.tier, status.expiresAt);
```
<!-- /tabs -->

> [!NOTE]
> The spec wins. Where any page and [spec/openapi.yaml](/spec/openapi.yaml) differ, the spec is the contract, and this reference is generated from it.

## Reading this reference {#reading}

- **Two servers.** SDK routes live under `/_br` on your own app origin; the browser and the browser SDK call them with the first-party cookie and nothing else. Core routes live on Core, `https://core.internal:8787` in the examples.
- **Errors.** Failures return `application/problem+json` ([`Problem`](#schema-Problem), RFC 9457) with `type`, `title` and `status`.
- **Protected routes.** Any route the backend SDK protects can answer with [`ChallengeRequired`](#response-challengerequired) (403) or [`Throttled`](#response-throttled) (429) instead of your app's response.
- **Anchors.** Operations are at `#op-<operationId>`, schemas at `#schema-<Name>`, headers at `#header-<name>`. They are stable.
- **Machine-readable.** The source is [spec/openapi.yaml](/spec/openapi.yaml); this page is also at [/docs/api.md](/docs/api.md).

<!-- @openapi -->

## Next steps {#where-next}

<!-- next -->
- [SDK reference](/docs/sdk/): Use the SDKs instead of raw HTTP
- [Policy reference](/docs/policy/): Write the policy `putPolicy` publishes
- [Configuration](/docs/configuration/#credentials): Set credentials for Core
- [Wire it in](/docs/wire/): Wire routes and headers into your app
- [Design and architecture](/docs/architecture/#sync): See sync in context

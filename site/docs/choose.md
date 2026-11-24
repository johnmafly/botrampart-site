---
title: Choose how to integrate
nav: Choose how to integrate
group: Integrate
order: 7
description: Where BotRampart checks requests: a backend SDK in your app, or nginx, a Cloudflare Worker or CloudFront at your edge. Every option starts in observe mode.
lede: Stop bad requests before your app does the work, inside your app or at your edge. Every option runs in your infrastructure or your cloud account: no vendor proxy sits in the path, and no one else sees your traffic.
---

This page compares the four places BotRampart can check requests and walks through the first install in observe mode. Every option speaks the same HTTP contract, so you can start with one and add another later.

> [!TIP]
> To hand the work to Claude Code, Cursor, Codex or another coding agent, copy the prompt in [Let your coding agent do it](#ai) or pick your exact stack in [Autoinstall](/docs/autoinstall/).

## Integration options {#options}

Each option does the same job on the wire: it reads the session cookie `__br_s`, charges the request against the session's budget, and answers with a challenge when the budget runs out. Pick the one that matches where your traffic already flows.

| Option | Where it runs | Request path |
| --- | --- | --- |
| [Backend SDK](#opt-sdk) | In your app: Node, Python, Go, Java, Ruby or PHP | Visitor, then your app with the SDK, then your handlers |
| [nginx module](#opt-nginx) | At your edge: nginx or ingress-nginx on Kubernetes | Visitor, then your nginx, then your app |
| [Cloudflare Worker](#opt-worker) | At your edge, in your own Cloudflare account | Visitor, then the Worker, then your origin |
| [CloudFront](#opt-cloudfront) | At your edge: Lambda@Edge in your own AWS account | Visitor, then the Lambda@Edge function, then your origin |

### Backend SDK {#opt-sdk}

In your app, for Node, Python, Go, Java, Ruby and PHP. Request path: visitor, then your app with the SDK in front of its handlers.

Runs inside your app process, in front of your handlers. It serves the browser script and challenge routes under `/_br` on your own origin, verifies `__br_s` with your site keys and syncs counters with Core every 5 to 10 seconds. It stays light: it keeps no aggregated visitor metrics, baselines or history, which Core builds. [Wire it in](/docs/wire/).

### nginx module {#opt-nginx}

At your edge, in nginx or ingress-nginx on Kubernetes. Request path: visitor, then your nginx with BotRampart, then your app.

Runs in the nginx you already operate, in front of your app. It verifies the `__br_s` cookie before nginx proxies the request, so it covers apps in any language without touching their code. [Set it up](/docs/integrations/#edge).

### Cloudflare Worker {#opt-worker}

At your edge, in your own Cloudflare account. Request path: visitor, then a Worker in your Cloudflare account, then your origin.

A Worker you deploy on the routes in front of your origin, in your Cloudflare account. It verifies the `__br_s` cookie at the edge; requests never pass through a BotRampart server. [Set it up](/docs/integrations/#edge).

### CloudFront {#opt-cloudfront}

At your edge, as Lambda@Edge in your own AWS account. Request path: visitor, then a Lambda@Edge function in your AWS account, then your origin.

A function on your distribution's viewer requests, in your AWS account. It verifies the `__br_s` cookie before CloudFront reaches your origin, with no vendor proxy in between. [Set it up](/docs/integrations/#edge).

Mobile SDKs for iOS and Android protect native apps the same way. [See every integration](/docs/integrations/).

### Let your coding agent do it {#ai}

Pick your framework, edge, Core host, bucket and decision model in [Autoinstall](/docs/autoinstall/). You get one prompt for Claude Code, Cursor, Codex or any coding agent, written for that stack. The prompt below covers the default stack.

<!-- @autoinstall-card -->

## What every option shares {#contract}

The integration is an HTTP contract, defined in full in the [OpenAPI spec](/spec/openapi.yaml). Whatever sits in front of your handlers, these are the parts your visitors and your logs see:

| Part | What it is |
| --- | --- |
| `__br_s` | One first-party cookie, set `HttpOnly` by your own server and signed with your site key. A random session ID, a tier and an expiry; no fingerprint. |
| `/_br/*` | The browser script and the challenge routes, served on your own origin: [the SDK routes](/docs/sdk/#routes). |
| `BR-Challenge: v1` | Marks a challenge (`403`) or throttle (`429`) answered instead of your app's response. |
| `BR-Sid`, `BR-Decision` | Set on every response that passes through. Your edge logs them and strips them. |
| `BR-Cost` | Your app sets it when a response's true cost is known only afterwards; the difference is settled on the session. |
| Core | One small service you run on Cloudflare Workers or as one container. Challenges, policy, counters and the decision log in your bucket. |

## Start in observe mode {#observe}

Observe mode decides every request, logs the decision and lets it through, so you see each decision BotRampart makes before it acts on any. You need:

- An app on a framework with a BotRampart SDK (Express, Fastify, Next.js, Django, Rails, Laravel, Spring or Go), or nginx, a Cloudflare Worker or CloudFront in front of it.
- Somewhere to run Core: a Cloudflare account (Workers Paid starts at $5 a month{{c:cf-workers-price}}) or any host that runs one container. Recommended: 256 MB of memory. No database server.
- An S3-compatible bucket: Cloudflare R2, Amazon S3 or MinIO.
- Optional: a key for a decision-model provider, or a self-hosted model. Without one, the five-minute loop is off and everything else works.

### 1. Configure Core {#core}

Core listens on port 8787. It reads where the lake is and which decision model to use from its environment, and its keys from your secret store. [Configuration](/docs/configuration/#core) explains each setting.

| Setting | Example | Meaning |
| --- | --- | --- |
| `BR_LAKE_URL` | `s3://acme-botrampart/br/v1/` | Where the lake lives |
| `BR_DECISION_PROVIDER` | `off` | `off`, `gemini`, `openai`, or a self-hosted model |
| Secret `br_keys` | site keys | Signs session tokens and puzzles |
| Secret `lake_writer` | bucket credential | Lets Core write the lake |

### 2. Mount the backend SDK in observe mode {#sdk}

Mount it at the root of your app, in front of your handlers, so every route gets a path class by default. Set `site`, `secretsFile`, `core` and `mode: "observe"`; [Wire it in](/docs/wire/#settings) lists every setting. It serves the `/_br` routes and sets `BR-Sid` and `BR-Decision` on every response.

### 3. Add the browser script {#script}

One script tag, served from your own origin by the backend SDK, so no third-party domain can change the code your visitors run. That is the lesson of the 2024 Polyfill.io incident, when a CDN script under new ownership served malware to more than 100,000 sites.{{c:polyfill}}

```html op=getSdkScript title="Your page template"
<script src="/_br/sdk.js" data-site="site_123" async></script>
```

### 4. Check the session {#check}

Open your site and ask what the browser holds. A first visit is tier 0; a moment later the proof-of-work has run in the background and the session is tier 1.

```http op=getSessionStatus title="In the browser, from your own origin"
GET /_br/status

{ "tier": 1, "expiresAt": 1794825300, "sessionEndsAt": 1795428300, "tierExpiresAt": {}, "identified": false }
```

### 5. Watch, then simulate {#watch}

Within the first hour the decision log in your bucket shows spend by path class, the sessions observe mode marked for a challenge and why, and path costs suggested from how long each path takes to answer. Replay a changed policy against that traffic before you enforce anything:

```shell op=simulatePolicy title="Replay a policy against the last 24 hours"
curl -X POST "http://localhost:8787/v1/policy/simulate" \
  -H "Authorization: Bearer $BR_CONSOLE_TOKEN" -H "Content-Type: application/json" \
  -d @draft-policy.json

{ "challenged_share_current": 0.004, "challenged_share_draft": 0.012, "signed_in_affected": 0 }
```

### 6. Enforce tier 1 {#enforce}

Switch `mode` to `"enforce"` with the default policy. Ordinary browsing stays inside the refill rate and sees nothing. Clients that cannot run JavaScript keep reading general pages on their 30-unit allowance and are asked for a proof-of-work on costly paths. Run the five-minute loop in shadow first, then let rules act on its answers once they match the calls you make yourself.

## Next steps {#next}

<!-- next -->
- [Wire it in](/docs/wire/): Wire the backend SDK into your app: settings, routes, challenges, sign-in, logs
- [Inside BotRampart](/docs/inside/): See each component, the data layout and the threat model
- [Integrations](/docs/integrations/#edge): Set up nginx, a Cloudflare Worker or CloudFront
- [Autoinstall](/docs/autoinstall/): Write the prompt for your stack and your coding agent
- [Configuration](/docs/configuration/#core): Tune every Core and SDK setting
- [Policy reference](/docs/policy/): Write path classes, budgets and rules

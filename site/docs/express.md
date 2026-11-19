---
title: Express
nav: Express
order: 7
description: Express installs BotRampart with one AI prompt. Pick your framework, where your app runs, your CDN or edge and your cloud; Express writes a prompt that has your coding agent install the SDK, provision Core and the decision log as Terraform, Pulumi or a CLI script, wire the edge and verify it, in observe mode.
lede: Pick your stack, copy one prompt, and your coding agent installs BotRampart and provisions what it runs on. You approve the plan; nothing is enforced until you say so.
---

## What Express does {#what}

Express turns four choices into one instruction prompt for Claude Code, Cursor, Codex or any coding agent. The prompt covers the whole install:

- **Install.** The backend SDK for your framework, mounted ahead of every route, and the browser script in your layout.
- **Provision.** Core, the decision-log bucket and a credential scoped to that bucket, in your own cloud account, written as infrastructure as code.
- **Edge.** The adapter for your CDN, on the same site keys and the same Core, so a session's budget is shared between the edge and the app.
- **Verify.** Response headers, the proof-of-work, the decision log and one decision lookup, before your agent stops and reports.

Open the picker at [Express](/express/). The home page carries a shorter version with the four stack choices.

## Your stack {#stack}

| Choice | Options |
|---|---|
| Framework | Express, Fastify, Next.js, Django, FastAPI, Rails, Laravel, Spring Boot, Go |
| Where your app runs | Containers or VMs, Kubernetes, Vercel, AWS Lambda, Google Cloud Run |
| CDN or edge | No CDN, Cloudflare (Worker), Amazon CloudFront (Lambda@Edge), nginx or ingress-nginx (module) |
| Cloud for Core and the log | Cloudflare (Workers and R2), AWS (ECS on Fargate and S3), Google Cloud (Cloud Run and Cloud Storage), Azure (Container Apps and Blob Storage), your Kubernetes (a Deployment and MinIO) |
| Provision with | Terraform, Pulumi, your cloud's CLI |
| Decision model | Off, Gemini Decision 1, a self-hosted model |
| Coding agent | Claude Code, Cursor, Codex, any agent |

Serverless runtimes (Vercel, AWS Lambda, Cloud Run) get a shared Redis or Valkey `store`, so budgets hold across instances. See [shared budgets](/docs/integrations/#store).

## What your agent does {#steps}

1. **Site keys.** Generates `br_keys` locally and stores it in your secret store by name.
2. **Provision.** Writes Core, the bucket and the `lake_writer` credential as Terraform, Pulumi or one CLI script, shows you the plan or preview, and waits for your approval.
3. **Install.** Adds the backend SDK for your framework in observe mode, with `site`, `secretsFile`, `core` and `mode: "observe"`. See [backend settings](/docs/configuration/#backend).
4. **Edge.** Deploys the adapter for your CDN, sends edge traffic to Core's [`ingestRollups`](/docs/api/#op-ingestRollups) through the log pack, and strips `BR-Sid` and `BR-Decision` before responses leave.
5. **Verify.** Checks `/_br/sdk.js`, the `BR-Decision` header, `/_br/status`, the decision log under `BR_LAKE_URL`, and one lookup with [`getDecision`](/docs/api/#op-getDecision).
6. **Stop before enforce.** Reports what changed, what it provisioned and which secrets you still need to set. Enforcing stays your decision, after a replay with [`simulatePolicy`](/docs/api/#op-simulatePolicy).

## Safety rails in every prompt {#rails}

- Packages are installed only by the names and versions the [quickstart](/docs/getting-started/) gives, pinned.
- Secrets are named, never printed, committed or pasted into the chat.
- Nothing is created in a cloud account before you approve the plan.
- The prompt never switches to enforce mode and never publishes a policy.

## Privacy {#privacy}

The prompt is built in your browser from your choices. Nothing is stored or sent, and the page sets no cookies.

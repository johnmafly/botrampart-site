---
title: Autoinstall
nav: Autoinstall
group: Get started
order: 2
description: Autoinstall writes one prompt for your coding agent from the stack you pick: framework, where your app runs, your CDN or edge and your cloud.
lede: Pick your stack, copy one prompt, and hand the work to your coding agent. You read every step before it runs, and nothing is enforced until you say so.
---

<!-- @autoinstall-card -->

## Use it {#quickstart}

1. Open [Autoinstall](/autoinstall/) and pick your framework, where your app runs, your CDN or edge and your cloud.
2. Copy the prompt and paste it into your coding agent at the root of your app's repository.
3. Read each change the agent shows you before it makes it.
4. Read the agent's report when it stops.

> [!NOTE]
> BotRampart publishes no package to a registry, and [the Quickstart](/docs/getting-started/#packages) names none. An agent must never install one by a guessed name. What runs today is the engine from source.

## What Autoinstall is {#what}

Autoinstall turns your choices into one instruction prompt for Claude Code, Cursor, Codex or any coding agent. The prompt is plain text: you can read all of it before you paste it, and the Markdown version of this page carries it in full. Autoinstall was first published as Express; the name changed so that nobody reads it as Express.js.

## What the prompt covers {#steps}

The prompt for the default stack has these parts, in order:

<!-- @autoinstall-steps -->

## Your stack {#stack}

<!-- @autoinstall-stack -->

On serverless runtimes (Vercel, AWS Lambda, Google Cloud Run) budgets hold across instances through a shared Redis or Valkey `store`. See [shared budgets](/docs/integrations/#store).

## Ground rules in the prompt {#rails}

Word for word from the prompt for the default stack:

<!-- @autoinstall-rules -->

## Privacy {#privacy}

The prompt is built in your browser from your choices. Your choices are never stored or sent, and the page sets no cookies.

## Next steps {#where-next}

<!-- next -->
- [Quickstart](/docs/getting-started/): Run the engine from source first
- [Choose how to integrate](/docs/choose/): Compare a backend SDK, an edge adapter and a mobile SDK
- [Configuration](/docs/configuration/#backend): See every option an integration sets
- [Shared budgets](/docs/integrations/#store): Keep budgets exact on serverless runtimes
- [Policy and cohort reference](/docs/policy/#publishing): Replay a policy before you enforce

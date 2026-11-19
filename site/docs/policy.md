---
title: Policy and cohort reference
nav: Policy and cohorts
group: Reference
order: 15
description: The BotRampart policy file field by field (path classes, budget, mint, risk score, rules), the CEL fields and actions rules use, publishing, simulation and rollback, and the cohorts, states and directives of the five-minute loop.
lede: One versioned YAML file per site decides what every request costs and what happens when a session cannot pay. This page defines every key in it, every field a rule can read, and the cohorts the five-minute loop watches.
---

The policy file is where you decide what BotRampart does. This page defines every key, field and action in it, and how a change is simulated, published and rolled back.

## When to use {#when-to-use}

- You are changing path costs, budgets or mint limits.
- You are writing a rule, or staging one in `log` mode.
- You want to replay a policy against the last 24 hours of traffic before you publish.
- You are writing rules on the five-minute loop's `ai.*` fields.

## Quickstart {#quickstart}

1. Read the version Core enforces now, or start from the [example policy](#file), and keep it as `botrampart.policy.yaml` in Git.
2. Change a path class's cost, or add a rule with `mode: log`.
3. Replay it with [`simulatePolicy`](/docs/api/#op-simulatePolicy) and check `signed_in_affected`.
4. Publish with [`putPolicy`](/docs/api/#op-putPolicy), naming the `base_version` you started from.

```shell op=getPolicy title="Read the version Core enforces now"
curl -H "Authorization: Bearer $BR_CONSOLE_TOKEN" -H "Accept: application/yaml" \
  "https://core.internal:8787/v1/policy"
```

> [!TIP]
> Rules are evaluated in order and the first match wins. Put allow rules for verified crawlers, partners and webhooks before the over-budget rule.

## The policy file {#file}

One file per site, `botrampart.policy.yaml`, kept in Git and editable in the console. Core type-checks it, compiles every condition and publishes it as an immutable version; SDKs pick up the new version at their next sync. The schema is [`Policy`](/docs/api/#schema-Policy). This is the example policy from the spec, version 12:

```yaml op=putPolicy cap="botrampart.policy.yaml (version 12)"
version: 12
path_classes:
  - { name: static, match: ["/assets/*", "*.css", "*.js", "*.png"], cost: 0, min_tier: 0 }
  - { name: general, match: ["/*"], cost: 1, min_tier: 0 }
  - { name: search, match: ["/api/search*"], cost: 5, min_tier: 1 }
  - { name: login, match: ["POST /login", "POST /api/session"], cost: 10, min_tier: 1 }
  - { name: checkout, match: ["/api/checkout*"], cost: 20, min_tier: 1 }
budget: { refill_per_min: 20, burst: 300, provisional: 30, grants: { pow: 300, human: 3000, step_up: 6000 }, grant_decay: 0.5, identified_multiplier: 3, account_ceiling_per_hour: 20000, max_concurrent: 6 }
mint: { ip: 20, prefix: 60, asn: baseline_x5, ja4: baseline_x5 }
risk_score:
  - { when: "session.debt_ratio >= 1", add: 2 }
  - { when: "signals.automation_flag", add: 4 }
  - { when: "signals.no_input_after_30_requests", add: 2 }
  - { when: "signals.pow_ms_implausible", add: 1 }
  - { when: "net.mint_pressure", add: 2 }
  - { when: "session.network_changes_1h >= 5", add: 2 }
rules:
  - { id: verified-bots, when: "net.verified_bot in ['search_engine', 'monitoring']", then: allow }
  - { id: not-a-browser, when: "!ua.is_browser || ua.browser_age_years > 3", then: block }
  - { id: risk-5, when: "risk.score >= 5", then: "challenge(human)" }
  - { id: ai-escalation, when: "ai.attack >= 0.9 && ai.confidence >= 0.7 && request.path_class in ['search', 'login']", then: "challenge(human)", mode: log }
  - { id: over-budget, when: "session.credits < request.cost", then: "challenge(next_tier) || throttle" }
  - { id: default, when: "true", then: allow }
```

## Path classes {#path-classes}

| Key | Type | Meaning |
| --- | --- | --- |
| `name` | string | The class name; rules read it as `request.path_class`. |
| `match` | list of strings | Path globs, optionally prefixed with a method, such as `POST /login`. |
| `cost` | integer, 0 or more | Units each request costs; 0 for static files. |
| `min_tier` | integer, 0 to 3 | The lowest tier that may use the class; a session below it is asked for a challenge first. |

Settle a response's true cost with [`BR-Cost`](/docs/sdk/#br-cost).

## Budget {#budget}

| Key | Default | Meaning |
| --- | ---: | --- |
| `refill_per_min` | 20 | Units a session regains each minute. |
| `burst` | 300 | Bucket size: refill never takes the balance above it. |
| `provisional` | 30 | Tier 0 allowance, general paths only. |
| `grants.pow` | 300 | Credit a passed proof-of-work buys. |
| `grants.human` | 3000 | Credit a passed human check buys. |
| `grants.step_up` | 6000 | Credit a passed step-up buys. |
| `grant_decay` | 0.5 | Each repeat pass of a tier within 24 hours buys this fraction of the previous one. |
| `identified_multiplier` | 3 | Budget multiplier for sessions with an attached login ID. |
| `account_ceiling_per_hour` | 20000 | Spend summed across all sessions of one login ID. |
| `max_concurrent` | 6 | In-flight requests per session. |

With these defaults one session can spend at most 35,363 units a day with tiers 0 to 2, and 47,175 with a step-up method enabled ([why](/docs/overview/#ceiling)).

## Mint {#mint}

New sessions allowed per network key in a 10-minute window: an integer, or `baseline_xN` for N times that key's own baseline.

| Key | Default | Counts new sessions per |
| --- | --- | --- |
| `ip` | 20 | Exact IP address |
| `prefix` | 60 | /24 for IPv4, /48 for IPv6 |
| `asn` | `baseline_x5` | Autonomous system |
| `ja4` | `baseline_x5` | TLS fingerprint family |

When a key is over its limit, Core publishes its combined mint pressure at the next sync ([`MintPressure`](/docs/api/#schema-MintPressure)): a multiplier from 1 to 10 on the proof-of-work, and optionally `human_on_costly` (a human check for new sessions on costly paths) or `refuse`. Established and signed-in sessions are exempt.

## Risk score {#risk-score}

`risk_score` is a visible scorecard from 0 to 10: a list of lines, each with a CEL `when` and either a fixed `add` or `add_field`, which adds the value of a field. Rules read the total as `risk.score`. A line can add an `ai.*` field, such as `ai.risk_level`, with `add_field`, so the model's answer moves the score within the 0 to 10 range.

## Rules {#rules}

Rules are evaluated in order and the first match wins.

| Key | Required | Meaning |
| --- | --- | --- |
| `id` | yes | A stable name, shown in decisions as `rule_id`. |
| `when` | yes | A CEL condition, compiled by Core to a typed [`ConditionTree`](/docs/api/#schema-ConditionTree). |
| `then` | yes | An action, optionally with a fallback: `a \|\| b`. |
| `mode` | no | `enforce` (default) or `log`, which runs the rule as a dry run: its decision is logged, not enforced. |

## Fields {#fields}

| Field | Examples | From |
| --- | --- | --- |
| `request.*` | `path_class`, `cost`, `method` | The request and your path classes |
| `session.*` | `tier`, `age`, `credits`, `identified`, `network_changes_1h`, `debt_ratio` | The cookie and the local budget |
| `ua.*` | `is_browser`, `family`, `browser_age_years` | User agent, parsed against a bundled release table |
| `net.*` | `mint_pressure`, `verified_bot`, `country`, `asn_class` | Mint buckets, crawler verification |
| `signals.*` | `automation_flag`, `no_input_after_30_requests`, `pow_ms_implausible` | Browser SDK, checked on the server |
| `risk.score` | 0 to 10 | The [risk scorecard](#risk-score) |
| `ai.*` | `attack`, `risk_level`, `intent`, `action`, `confidence` | The five-minute loop's [directives](#directives), with expiry |

## Actions {#actions}

| Action | Effect |
| --- | --- |
| `allow` | Serve the request and charge it. `allow(budget: agent)` charges the named budget instead. |
| `log` | Record the decision and allow. |
| `challenge(pow \| human \| step_up \| next_tier)` | Answer with a challenge (`403`, `BR-Challenge: v1`). `next_tier` asks for the next tier whose grant is still worth having. `step_up` asks for a tier 3 method: email link, sign-in, passkey, an image puzzle or a third-party widget, always with a non-visual option. |
| `pow(multiplier)` | Ask for a proof-of-work made harder by the multiplier. |
| `throttle` | `429` with `Retry-After` until the budget refills. |
| `block` | Refuse the request. |
| `degrade` | Tell your app to serve a cheaper response; `BR-Decision` reads `degrade`. |
| `add_risk(n)` | Add `n` to the session's risk score. |

A fallback after `||` applies when the first action cannot be served: `challenge(next_tier) || throttle` throttles once no grant is left. The compiled form is [`CompiledAction`](/docs/api/#schema-CompiledAction).

## Publishing, simulation and rollback {#publishing}

- **Simulate first.** [`simulatePolicy`](/docs/api/#op-simulatePolicy) replays a policy, or an existing version, against the last 24 hours and reports the share of sessions it would challenge, block and throttle against the current version, matches per rule, and the signed-in sessions it would newly affect.
- **Edit in the console.** The console's policy editor type-checks as you type, runs the simulation, and publishes through the same call as the CLI.
- **Publish.** [`putPolicy`](/docs/api/#op-putPolicy) takes the policy and the `base_version` it was based on; it fails with `409` when that is no longer current and `422` when the policy does not type-check. It records who published and who approved it.
- **Read.** [`getPolicy`](/docs/api/#op-getPolicy) returns the current version or any earlier one, with its compiled form.
- **Roll back** by publishing the previous version again.
- **Stage a rule** with `mode: log` for a week before it enforces.
- **Take a suggestion.** The agent suggests changes as a diff with a reason and a simulation; it publishes only when a named person approves it.

## Cohorts {#cohorts}

A cohort is a group of sessions the five-minute loop watches as one, keyed by:

| Key | Values |
| --- | --- |
| `network_class` | `hosting`, `consumer_broadband`, `mobile`, `other` |
| `session_age` | A band, such as `under_10m` |
| `path_class` | One of your path classes |

Every five minutes Core builds a state for the whole site and for cohorts that drift from their own baseline for that hour of the week. On BotRampart Cloud the number of cohorts the model watches depends on the plan: Free asks only about the site as a whole, Starter watches 5 cohorts, Growth 20 and Scale 50 ([plans](/own/#cloud)).

## States {#states}

A state ([`StateV1`](/docs/api/#schema-StateV1), `br.state.v1`) has a scope (`site`, `cohort` or `session`, with a window such as `2026-11-16T10:05:00Z/PT5M`), `metrics` with the numbers, kept in the lake for people and the agent, and `buckets`, the named bands that are the model's only input:

| Band group | Bands |
| --- | --- |
| `traffic` | `requests_vs_baseline`, `cost_vs_baseline`, `new_session_share`, `provisional_share` |
| `targets` | `top_path_class`, `top_path_spend_share`, `login_fail_ratio`, `status_4xx_share` |
| `challenges` | `pow_pass_rate`, `pow_solve_time`, `human_pass_rate` |
| `interaction` | `sessions_with_input_events`, `vs_baseline`, `automation_flag_share` |
| `network` | `network_class`, `spread`, `top_asn_share`, `mint_pressure` |
| `budget` | `sessions_over_budget` |
| `context` | `declared_event` (set by you, for example a sale or a press launch), `hour_class`, `current_ai_level` |

No free-text field a visitor wrote ever appears in a state.

## Directives {#directives}

A directive ([`Directive`](/docs/api/#schema-Directive)) publishes `ai.*` fields for a cohort or one session, from a model answer or a deterministic tripwire, with an expiry of at most 60 minutes. Directives set fields, never actions: your rules act on them. Stage an `ai.*` rule with `mode: log`, as the example does, then switch it to `enforce` once its thresholds match your traffic.

| Field | Values |
| --- | --- |
| `ai.attack` | 0.01 to 0.99: probability of automated abuse |
| `ai.risk_level` | 0 to 4 |
| `ai.intent` | `content_scraping`, `credential_stuffing`, `checkout_or_inventory_abuse`, `fake_signups`, `resource_exhaustion`, `organic_spike`, `normal` |
| `ai.action` | `none`, `raise_pow`, `human_check`, `step_up`, `lower_budget` |
| `ai.confidence` | 0 to 1 |

A directive matches on `asn_class`, `session_age`, `path_class` or a session's hash `sid`. Escalation needs two windows that agree; stepping down follows three calm windows.

## Where to go next {#where-next}

| Goal | Page |
| --- | --- |
| See the budget arithmetic | [Overview](/docs/overview/#economics) |
| Read the schema of every key | [Policy schema](/docs/api/#schema-Policy) |
| Roll out from observe to enforce | [Self-hosting](/docs/self-hosting/#rollout) |
| See what the five-minute loop sends to the model | [Design and architecture](/docs/architecture/#decision-model) |
| Let a known agent through on its own budget | [Integrations](/docs/integrations/#no-cookie) |

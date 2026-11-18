---
title: Security model
nav: Security model
order: 11
description: BotRampart's security model: trust boundaries, the signed session token, proof-of-work and attestations, credentials and roles, the data kept and never collected, guardrails on the decision model and the agent, script delivery, and the threats that remain.
lede: What BotRampart trusts, what it signs, what it keeps, and which threats remain after every control is in place.
---

## Trust boundaries {#boundaries}

| Boundary | What crosses it | Protection |
| --- | --- | --- |
| Browser to your app | Requests with the `__br_s` cookie; challenge solutions; interaction counts | The cookie is `HttpOnly`, signed with your site key and checked in memory. Puzzles are signed, expire and are single-use. Signals are checked on the server. |
| Your app to Core | Per-session counters with hashed session IDs, decision events, mint counts | An instance key per deployment. No per-request record and no cookie leave your app. |
| Core to the lake | Rollups, decisions, states, answers, directives, policy versions | A writer credential for your own bucket. |
| Core to the decision model | Named bands from a state, and four typed questions | No identifiers and no text a visitor wrote. A self-hosted model keeps it inside your network. |
| The agent to the lake | Read-only queries | A key scoped read-only to `br/v1/`; the agent inherits the asking person's role. |
| Console, agent and CLI to Core | Policy reads and publishes, decision lookups | A role-scoped console token: viewer to read, admin to publish. |

## The session token {#token}

- **Format.** `br1.<payload>.<signature>`, where signature is `HMAC-SHA256(site_secret[kid], "br1." + payload)`. Alternatively Core signs tokens with Ed25519, at one Core call per new session.
- **One identifier.** `sid` is 128 random bits. There is no device fingerprint.
- **Short life.** The token lives 30 minutes and renews on use, inside a session of at most seven days, so a revoked session stops within half an hour even on an instance that missed a sync.
- **Soft binding.** The token records the browser family and the network's ASN. A mismatch drops the session to tier 0 and asks for a new proof-of-work; it does not block, so roaming phones keep working.
- **Not readable by scripts.** The cookie is `HttpOnly; Secure; SameSite=Lax`, and it is a bearer credential that must never reach a log: the SDK exposes `BR-Sid`, a 12-character hash, for logging instead.

## Challenges and attestations {#challenges}

- **Proof-of-work** ([`PowChallenge`](/docs/api/#schema-PowChallenge)) is issued by the backend SDK and signed with the site secret, expires in 120 seconds, is bound to the network prefix and browser family, and its salt is single-use in a replay cache. Difficulty comes from the server's view of risk and mint pressure, never from the client.
- **Human checks and step-up methods** are scored by Core, which returns an Ed25519-signed attestation the backend SDK verifies with Core's public keys ([`getKeys`](/docs/api/#op-getKeys)); the browser redeems it at `/_br/redeem`.
- **Accessibility.** The human check works with a keyboard and a screen reader, and every step-up configuration offers at least one method that needs no puzzle. WCAG 2.2 success criterion 3.3.8 does not allow a cognitive test in an authentication step without an alternative or a mechanism to help.{{c:wcag-338}}

## Data kept, and never collected {#data}

| Kept | Where | Form |
| --- | --- | --- |
| Session ID | Lake | A hash; `BR-Sid` is its first 12 hex characters |
| Login ID | Token and lake | A keyed hash, `HMAC-SHA256(site_uid_key, userId)` |
| Network | Lake | Prefix, ASN and country, never the address |
| Interaction signals | Lake, 30 days | Event counts, timings and flags |
| Decisions and challenges | Lake, 13 months | Rule, policy version, budget, cost, outcome |

Never collected, in any signal mode: canvas, WebGL or audio fingerprints, font lists, stable device identifiers, keystroke content, or pointer coordinates outside the challenge widget. Every record stays in your bucket.

For EU sites, run the browser SDK with `signals: "minimal"` or `"off"` and document the cookie as a security measure. France's regulator says anti-robot measures whose sole purpose is securing the site or its sign-in need no consent;{{c:cnil-antibot}} the cookie and signals must then be used for nothing else. This is an engineering reading, not legal advice.

## The decision model and the agent {#model-agent}

- **Closed inputs.** The model sees named bands and enums only: no identifiers and no text a visitor wrote. Paths become your class names and user agents a browser family.
- **Fields, not verdicts.** Answers become `ai.*` fields with an expiry of at most 60 minutes. The model can raise a tier or lower a budget, never block or allow; rules hold the gate.
- **Clamped baselines.** Baselines are clamped so traffic cannot walk them up quickly.
- **A read-only agent.** It queries the lake with a read-only key, uses fixed queries before any free-form SQL (one `SELECT`, with row, size and time caps), attaches the query and rows to every answer, and cannot change anything. A policy change it suggests is approved by a named person with a separate credential.

That separation matters because stored log text can carry instructions aimed at a model: injected log entries steered LLM log analysis up to 88.2% of the time in one 2026 study.{{c:loginject}}

## Script delivery {#delivery}

The browser SDK is served from your own origin by the backend SDK, with an integrity hash, from signed releases, so no third-party domain can change the code your visitors run. In 2024 the Polyfill.io CDN served malware to more than 100,000 sites after a change of owner.{{c:polyfill}}

## Threats and what remains {#threats}

| Threat | Control | What remains |
| --- | --- | --- |
| Clients minting new sessions | Tier 0 allowance; mint buckets per IP, prefix and ASN; harder puzzles under pressure | Large residential proxy pools |
| Solved cookies handed to other clients | Budget is per session, so sharing a cookie shares one budget; soft binding; 30-minute tokens | Reuse within one network and browser family until the budget is spent |
| Paid solvers | Credit, not clearance; halving grants; daily ceiling | Bounded throughput per session for an operator who pays |
| Native proof-of-work solvers | Memory-hard puzzles, difficulty from risk; proof-of-work treated as a minting cost only | Still cheap for a funded attacker |
| Real browsers under automation | Budgets apply whoever drives the browser | Indistinguishable from a person until the budget runs out, which is the intent |
| Prompt injection into the model or agent | No visitor text in the state; closed outputs; rules hold the gate; agent cannot write | Traffic shaped to look like an organic spike; baselines are clamped so they cannot be walked up quickly |
| Compromised script delivery | First-party hosting, integrity hash, signed releases | Compromise of your own origin |
| Stolen site secret | Key IDs, overlapping rotation, separate keys per purpose | Tokens minted until rotation |
| Core outage | Core is not in the request path; static mode keeps tier 1, budgets and rules | No escalation above tier 1 while Core is down |

## This website {#site}

This site follows the same rules it describes: it sets no cookies, loads nothing from anyone else, and serves a Content-Security-Policy of `default-src 'self'` with no inline scripts or styles. Its source and every test are in the [repository](https://github.com/johnmafly/botrampart-site).

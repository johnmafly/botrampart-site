# BotRampart: state

Kept current by the Chief (the BotRampart Reason). Greenhouse reads this file every round.

As of: 2026-11-18. Status: seed (onboarding). Round: none submitted. Rounds used: 0 of 6.

## Spend

| Item | Amount | As of | Source |
|---|---|---|---|
| Model spend against the Greenhouse budget | $0.00 | 2026-11-18 | Onboarding was done by VC Joe, not the Chief. |
| Pre-intake research (market analysis, architecture plan) | not counted against the budget | 2026-11-18 | Done before the project became a seed. |
| Model-spend cap | $150 (proposal, awaiting owner approval) | 2026-11-18 | `portfolio/botrampart/intake.yaml` in johnmafly/greenhouse |

The Chief updates `spend_usd` and `as_of` here from its own Sessions' `cost_usd`; VC Joe recomputes it each round.
At 80% of any budget (rounds, spend, time) the Chief stops and reports.

## Decisions

- Intake: the founder's architecture plan (16 November 2026) and market analysis (15 November 2026), as recorded in `portfolio/botrampart/intake.yaml`.
- Hosting: Cloudflare Pages project `botrampart`, built by Cloudflare from `main` only (`npm run build`, output `dist`). Public, `noindex` until the owner publishes.
- This repository starts as an unstyled skeleton that satisfies the package contract's structure. Visual design is the Chief's.

## Open findings

None yet (no judged round).

## Next steps

1. Build package v1: introduction site, the five docs sections, pricing, mock signup, `spec/openapi.yaml`, `claims.yaml` (Greenhouse issue #14).
2. Run `greenhouse check` locally until preflight is green.
3. Submit round 01 with `greenhouse submit`.

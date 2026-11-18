# botrampart-site

BotRampart's Greenhouse package: the introduction site, docs, pricing, mock signup and build spec
for BotRampart, an open-source, self-hosted bot defense. The product is not built yet; this site is
a preview and is not indexed.

Owned by the BotRampart Chief. Judged by [Greenhouse](https://github.com/johnmafly/greenhouse)
against its package contract (`docs/package-contract.md` there).

## Layout

| Path | What |
|---|---|
| `site/` | Static pages, `_headers` (sends `X-Robots-Tag: noindex`), `_partials/` (shared head, header, footer, docs nav), `assets/` (one stylesheet, small scripts, `economics.mjs`). |
| `scripts/build.mjs` | Copies `site/` to `dist/`, fills the partials, turns `{{c:claim-id}}` into numbered source links from `claims.yaml`, copies the spec, writes `/.well-known/greenhouse.json` with the commit SHA. |
| `scripts/check-links.mjs` | Checks every source URL in `claims.yaml` (network; not part of `npm test`). |
| `site/assets/economics.mjs` | Reference implementation of request economics; the site's simulations and the tests use it. |
| `experiments/` | Measurements that test locked assumptions (`verify-bench`: offline cookie verification cost). |
| `test/` | Contract checks (routes, one `h1`, `lang`, noindex, placeholders, links, `greenhouse.json`) and package checks (`data-op` against the spec, claims coverage, economics numbers, no tracking or storage, signup is a preview). |
| `spec/openapi.yaml` | Build spec that docs code samples are checked against. |
| `claims.yaml` | Every public factual claim, with source and verbatim quote. |
| `greenhouse.yaml` | Greenhouse manifest: slug, build command, output, production branch. |
| `STATE.md` | Decisions, open findings, next steps, spend. |

## Build

Node 24+, no dependencies.

```bash
npm run build   # writes dist/
npm test        # builds, then checks the contract and the package
npm run check-links   # every claims.yaml source URL (network)
npm run bench   # experiment 1: verify + charge cost per request
```

Pages cite facts as `{{c:id}}`; add the claim to `claims.yaml` first (source URL, verbatim quote,
date checked) or the build fails.

Deploys: Cloudflare Pages (project `botrampart`) builds `main` on every push through its GitHub
integration. No deploy credential lives in this repository. Pull requests are checked by
`.github/workflows/check.yml` and are not deployed.

Live: https://botrampart.agenthatch.ai (also https://botrampart.pages.dev).

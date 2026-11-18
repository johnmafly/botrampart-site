# botrampart-site

BotRampart's Greenhouse package: the introduction site, docs, pricing, mock signup and build spec
for BotRampart, an open-source, self-hosted bot defense. The product is not built yet; this site is
a preview and is not indexed.

Owned by the BotRampart Chief. Judged by [Greenhouse](https://github.com/johnmafly/greenhouse)
against its package contract (`docs/package-contract.md` there).

## Layout

| Path | What |
|---|---|
| `site/` | Static pages, `_headers` (sends `X-Robots-Tag: noindex`). |
| `scripts/build.mjs` | Copies `site/` to `dist/` and writes `/.well-known/greenhouse.json` with the commit SHA. |
| `test/` | Contract checks: routes, one `h1`, `lang`, noindex, no placeholder text, internal links, `greenhouse.json`. |
| `spec/openapi.yaml` | Build spec that docs code samples are checked against. |
| `claims.yaml` | Every public factual claim, with source and verbatim quote. |
| `greenhouse.yaml` | Greenhouse manifest: slug, build command, output, production branch. |
| `STATE.md` | Decisions, open findings, next steps, spend. |

## Build

Node 24+, no dependencies.

```bash
npm run build   # writes dist/
npm test        # builds, then checks the contract
```

Deploys: Cloudflare Pages (project `botrampart`) builds `main` on every push through its GitHub
integration. No deploy credential lives in this repository. Pull requests are checked by
`.github/workflows/check.yml` and are not deployed.

Live: https://botrampart.agenthatch.ai (also https://botrampart.pages.dev).

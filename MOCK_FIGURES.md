# Mock figures

Every benchmark figure on the site is a sample figure for the private preview. None of them was measured. Each one must be swapped for a measured value, with its run published, before anyone outside sees the site.

Wherever these figures appear, the page shows the note "Sample figures for the private preview" right beside them.

## How to swap one

- **Home page:** edit the value in `site/index.html` at the line below.
- **Console preview:** edit `BENCH_ROWS` or `BENCH_CONTROL` in `site/assets/dashboard-data.mjs`. `site/dashboard/index.html` holds a static copy of the same table between `<!-- dash:benchmark -->` and `<!-- /dash:benchmark -->` (line 212). Regenerate it with `fillStatic` from `dashboard-data.mjs`.
- **Totals:** the home page's headline stats are derived from the table. Recompute them when a row changes: 6,500 is the sum of the four tool rows, and 99.6% is 6,475 caught out of 6,500.

## Every mocked number

| Value | What it stands for | Page and selector | Source file:line |
| --- | --- | --- | --- |
| 99.6% | automated sessions caught, all tools | `/` `#benchmark .bench-stats` (1st stat) | [site/index.html:236](site/index.html#L236) |
| 6,500 | automated sessions run, all tools (sum of the four rows) | `/` `#benchmark .bench-stats` (1st stat) | [site/index.html:236](site/index.html#L236) |
| 0.3% | human sessions flagged (false-positive rate) | `/` `#benchmark .bench-stats` (2nd stat) | [site/index.html:237](site/index.html#L237) |
| 10,000 | human sessions in the control | `/` `#benchmark .bench-stats` (2nd stat) | [site/index.html:237](site/index.html#L237) |
| 0.5 s | median time to catch a scripted browser | `/` `#benchmark .bench-stats` (3rd stat) | [site/index.html:238](site/index.html#L238) |
| 2,000 | Headless Chrome: sessions run | `/` `#benchmark table` row Headless Chrome | [site/index.html:247](site/index.html#L247) |
| 99.9% | Headless Chrome: caught | `/` `#benchmark table` row Headless Chrome | [site/index.html:247](site/index.html#L247) |
| 0.4 s | Headless Chrome: median time to catch | `/` `#benchmark table` row Headless Chrome | [site/index.html:247](site/index.html#L247) |
| 2,000 | Headless Chrome: sessions run | `/dashboard/` `#benchmark .bench-grid` row Headless Chrome | [site/assets/dashboard-data.mjs:540](site/assets/dashboard-data.mjs#L540) |
| 99.9% | Headless Chrome: caught | `/dashboard/` `#benchmark .bench-grid` row Headless Chrome | [site/assets/dashboard-data.mjs:540](site/assets/dashboard-data.mjs#L540) |
| 0.4 s | Headless Chrome: median time to catch | `/dashboard/` `#benchmark .bench-grid` row Headless Chrome | [site/assets/dashboard-data.mjs:540](site/assets/dashboard-data.mjs#L540) |
| 2,000 | Playwright: sessions run | `/` `#benchmark table` row Playwright | [site/index.html:248](site/index.html#L248) |
| 99.7% | Playwright: caught | `/` `#benchmark table` row Playwright | [site/index.html:248](site/index.html#L248) |
| 0.6 s | Playwright: median time to catch | `/` `#benchmark table` row Playwright | [site/index.html:248](site/index.html#L248) |
| 2,000 | Playwright: sessions run | `/dashboard/` `#benchmark .bench-grid` row Playwright | [site/assets/dashboard-data.mjs:541](site/assets/dashboard-data.mjs#L541) |
| 99.7% | Playwright: caught | `/dashboard/` `#benchmark .bench-grid` row Playwright | [site/assets/dashboard-data.mjs:541](site/assets/dashboard-data.mjs#L541) |
| 0.6 s | Playwright: median time to catch | `/dashboard/` `#benchmark .bench-grid` row Playwright | [site/assets/dashboard-data.mjs:541](site/assets/dashboard-data.mjs#L541) |
| 2,000 | Puppeteer: sessions run | `/` `#benchmark table` row Puppeteer | [site/index.html:249](site/index.html#L249) |
| 99.8% | Puppeteer: caught | `/` `#benchmark table` row Puppeteer | [site/index.html:249](site/index.html#L249) |
| 0.5 s | Puppeteer: median time to catch | `/` `#benchmark table` row Puppeteer | [site/index.html:249](site/index.html#L249) |
| 2,000 | Puppeteer: sessions run | `/dashboard/` `#benchmark .bench-grid` row Puppeteer | [site/assets/dashboard-data.mjs:542](site/assets/dashboard-data.mjs#L542) |
| 99.8% | Puppeteer: caught | `/dashboard/` `#benchmark .bench-grid` row Puppeteer | [site/assets/dashboard-data.mjs:542](site/assets/dashboard-data.mjs#L542) |
| 0.5 s | Puppeteer: median time to catch | `/dashboard/` `#benchmark .bench-grid` row Puppeteer | [site/assets/dashboard-data.mjs:542](site/assets/dashboard-data.mjs#L542) |
| 500 | AI browser agents: sessions run | `/` `#benchmark table` row AI browser agents | [site/index.html:250](site/index.html#L250) |
| 97.4% | AI browser agents: caught | `/` `#benchmark table` row AI browser agents | [site/index.html:250](site/index.html#L250) |
| 3.1 s | AI browser agents: median time to catch | `/` `#benchmark table` row AI browser agents | [site/index.html:250](site/index.html#L250) |
| 500 | AI browser agents: sessions run | `/dashboard/` `#benchmark .bench-grid` row AI browser agents | [site/assets/dashboard-data.mjs:543](site/assets/dashboard-data.mjs#L543) |
| 97.4% | AI browser agents: caught | `/dashboard/` `#benchmark .bench-grid` row AI browser agents | [site/assets/dashboard-data.mjs:543](site/assets/dashboard-data.mjs#L543) |
| 3.1 s | AI browser agents: median time to catch | `/dashboard/` `#benchmark .bench-grid` row AI browser agents | [site/assets/dashboard-data.mjs:543](site/assets/dashboard-data.mjs#L543) |
| 10,000 | People (control): sessions | `/` `#benchmark table` row People (control) | [site/index.html:251](site/index.html#L251) |
| 0.3% | People (control): flagged | `/` `#benchmark table` row People (control) | [site/index.html:251](site/index.html#L251) |
| 10,000 | People (control): sessions | `/dashboard/` `#benchmark .bench-grid` row People (control) | [site/assets/dashboard-data.mjs:545](site/assets/dashboard-data.mjs#L545) |
| 0.3% | People (control): flagged | `/dashboard/` `#benchmark .bench-grid` row People (control) | [site/assets/dashboard-data.mjs:545](site/assets/dashboard-data.mjs#L545) |

## Mocked text

- **The method paragraph** (`/` `#benchmark .bench-method`, [site/index.html:257](site/index.html#L257)) describes how the figures would be produced: a test origin, the Node SDK in observe mode, the default policy, and caught before the third protected request. No such run has happened.
- **"Caught by" column** ("Browser signals" and "UI behaviour") on both pages: mock attributions for each row.

## Not covered here

- **No figures for named vendors.** No bot-management vendor has a figure anywhere on the site.
- **Console sample data.** The rest of the console preview (`/dashboard/`) is generated from a fixed seed in `site/assets/dashboard-data.mjs` and labelled "Sample data" on the page. It is not listed figure by figure here.

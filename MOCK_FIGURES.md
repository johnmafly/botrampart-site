# Mock figures

Every benchmark figure on the site is a sample figure for the private preview. None of them was measured, and no vendor's product was tested. Each one must be swapped for a measured value, with its run published, before anyone outside sees the site. That matters most for the vendor rows: they put numbers on named companies' products.

Wherever these figures appear, the page shows the note "Sample figures for the private preview" right beside them, and the element holding them carries `data-mock` (greenhouse gate mock-figures, decision 0008).

## How to swap one

- **Home page:** edit the value in `site/index.html` at the line below. The grid there is a static copy of the console's data.
- **Console preview:** edit `BENCH_TOOLS` or `BENCH_VENDORS` in `site/assets/dashboard-data.mjs`. `site/dashboard/index.html` holds a static copy of the same grid between `<!-- dash:benchmark -->` and `<!-- /dash:benchmark -->` (line 212). Regenerate it with `fillStatic` from `dashboard-data.mjs`.
- **Heat bands:** each cell's class (`b1` to `b5`) comes from `benchBand` in `dashboard-data.mjs`: 98% and up is `b5`, 95% `b4`, 90% `b3`, 80% `b2`, below that `b1`. Update the class on the home page when a value crosses a band.
- **Totals:** the home page's headline stats are derived from BotRampart's row. 12,500 is the sum of the Sessions per vendor row; 99.4% is 12,421 caught out of 12,500; +13.9 pts is BotRampart's AI browser agents cell minus the highest other vendor's. Recompute them when a cell changes.

## Every mocked number

147 benchmark entries: 9 vendors by 7 tools on each of two pages, the sessions row on each page, the home page's three headline stats and the console's false-positive line.

| Figure | What it stands for | Page | Selector | Source file:line |
| --- | --- | --- | --- | --- |
| 99.4% | BotRampart: automated sessions caught, all tools (12,421 of 12,500) | `/` | `#benchmark .bench-stats` (1st stat) | [site/index.html:317](site/index.html#L317) |
| 12,500 | automated sessions per vendor, all tools (sum of the Sessions per vendor row) | `/` | `#benchmark .bench-stats` (1st stat) | [site/index.html:317](site/index.html#L317) |
| 0.3% | BotRampart: human sessions flagged (false-positive rate) | `/` | `#benchmark .bench-stats` (2nd stat) | [site/index.html:318](site/index.html#L318) |
| 10,000 | human sessions in the control | `/` | `#benchmark .bench-stats` (2nd stat) | [site/index.html:318](site/index.html#L318) |
| +13.9 pts | BotRampart's lead on AI browser agents over the next vendor (97.4% vs Kasada 83.5%) | `/` | `#benchmark .bench-stats` (3rd stat) | [site/index.html:319](site/index.html#L319) |
| 0.3% | BotRampart: human sessions flagged (false-positive rate) | `/dashboard/` | `#benchmark .bench-h` | [site/assets/dashboard-data.mjs:575](site/assets/dashboard-data.mjs#L575) |
| 10,000 | human sessions in the control | `/dashboard/` | `#benchmark .bench-h` | [site/assets/dashboard-data.mjs:575](site/assets/dashboard-data.mjs#L575) |
| 99.9% | BotRampart catching Headless Chrome | `/` | `#benchmark table` row BotRampart, column 1 (Headless Chrome) | [site/index.html:328](site/index.html#L328) |
| 99.9% | BotRampart catching Headless Chrome | `/dashboard/` | `#benchmark .bench-grid` row BotRampart, column 1 (Headless Chrome) | [site/assets/dashboard-data.mjs:550](site/assets/dashboard-data.mjs#L550) |
| 99.8% | BotRampart catching Selenium | `/` | `#benchmark table` row BotRampart, column 2 (Selenium) | [site/index.html:328](site/index.html#L328) |
| 99.8% | BotRampart catching Selenium | `/dashboard/` | `#benchmark .bench-grid` row BotRampart, column 2 (Selenium) | [site/assets/dashboard-data.mjs:550](site/assets/dashboard-data.mjs#L550) |
| 99.7% | BotRampart catching Playwright | `/` | `#benchmark table` row BotRampart, column 3 (Playwright) | [site/index.html:328](site/index.html#L328) |
| 99.7% | BotRampart catching Playwright | `/dashboard/` | `#benchmark .bench-grid` row BotRampart, column 3 (Playwright) | [site/assets/dashboard-data.mjs:550](site/assets/dashboard-data.mjs#L550) |
| 99.8% | BotRampart catching Puppeteer | `/` | `#benchmark table` row BotRampart, column 4 (Puppeteer) | [site/index.html:328](site/index.html#L328) |
| 99.8% | BotRampart catching Puppeteer | `/dashboard/` | `#benchmark .bench-grid` row BotRampart, column 4 (Puppeteer) | [site/assets/dashboard-data.mjs:550](site/assets/dashboard-data.mjs#L550) |
| 98.9% | BotRampart catching Puppeteer Stealth | `/` | `#benchmark table` row BotRampart, column 5 (Puppeteer Stealth) | [site/index.html:328](site/index.html#L328) |
| 98.9% | BotRampart catching Puppeteer Stealth | `/dashboard/` | `#benchmark .bench-grid` row BotRampart, column 5 (Puppeteer Stealth) | [site/assets/dashboard-data.mjs:550](site/assets/dashboard-data.mjs#L550) |
| 98.6% | BotRampart catching undetected-chromedriver | `/` | `#benchmark table` row BotRampart, column 6 (undetected-chromedriver) | [site/index.html:328](site/index.html#L328) |
| 98.6% | BotRampart catching undetected-chromedriver | `/dashboard/` | `#benchmark .bench-grid` row BotRampart, column 6 (undetected-chromedriver) | [site/assets/dashboard-data.mjs:550](site/assets/dashboard-data.mjs#L550) |
| 97.4% | BotRampart catching AI browser agents | `/` | `#benchmark table` row BotRampart, column 7 (AI browser agents) | [site/index.html:328](site/index.html#L328) |
| 97.4% | BotRampart catching AI browser agents | `/dashboard/` | `#benchmark .bench-grid` row BotRampart, column 7 (AI browser agents) | [site/assets/dashboard-data.mjs:550](site/assets/dashboard-data.mjs#L550) |
| 97.8% | Cloudflare catching Headless Chrome | `/` | `#benchmark table` row Cloudflare, column 1 (Headless Chrome) | [site/index.html:329](site/index.html#L329) |
| 97.8% | Cloudflare catching Headless Chrome | `/dashboard/` | `#benchmark .bench-grid` row Cloudflare, column 1 (Headless Chrome) | [site/assets/dashboard-data.mjs:551](site/assets/dashboard-data.mjs#L551) |
| 96.9% | Cloudflare catching Selenium | `/` | `#benchmark table` row Cloudflare, column 2 (Selenium) | [site/index.html:329](site/index.html#L329) |
| 96.9% | Cloudflare catching Selenium | `/dashboard/` | `#benchmark .bench-grid` row Cloudflare, column 2 (Selenium) | [site/assets/dashboard-data.mjs:551](site/assets/dashboard-data.mjs#L551) |
| 95.4% | Cloudflare catching Playwright | `/` | `#benchmark table` row Cloudflare, column 3 (Playwright) | [site/index.html:329](site/index.html#L329) |
| 95.4% | Cloudflare catching Playwright | `/dashboard/` | `#benchmark .bench-grid` row Cloudflare, column 3 (Playwright) | [site/assets/dashboard-data.mjs:551](site/assets/dashboard-data.mjs#L551) |
| 96.1% | Cloudflare catching Puppeteer | `/` | `#benchmark table` row Cloudflare, column 4 (Puppeteer) | [site/index.html:329](site/index.html#L329) |
| 96.1% | Cloudflare catching Puppeteer | `/dashboard/` | `#benchmark .bench-grid` row Cloudflare, column 4 (Puppeteer) | [site/assets/dashboard-data.mjs:551](site/assets/dashboard-data.mjs#L551) |
| 88.3% | Cloudflare catching Puppeteer Stealth | `/` | `#benchmark table` row Cloudflare, column 5 (Puppeteer Stealth) | [site/index.html:329](site/index.html#L329) |
| 88.3% | Cloudflare catching Puppeteer Stealth | `/dashboard/` | `#benchmark .bench-grid` row Cloudflare, column 5 (Puppeteer Stealth) | [site/assets/dashboard-data.mjs:551](site/assets/dashboard-data.mjs#L551) |
| 84.7% | Cloudflare catching undetected-chromedriver | `/` | `#benchmark table` row Cloudflare, column 6 (undetected-chromedriver) | [site/index.html:329](site/index.html#L329) |
| 84.7% | Cloudflare catching undetected-chromedriver | `/dashboard/` | `#benchmark .bench-grid` row Cloudflare, column 6 (undetected-chromedriver) | [site/assets/dashboard-data.mjs:551](site/assets/dashboard-data.mjs#L551) |
| 71.6% | Cloudflare catching AI browser agents | `/` | `#benchmark table` row Cloudflare, column 7 (AI browser agents) | [site/index.html:329](site/index.html#L329) |
| 71.6% | Cloudflare catching AI browser agents | `/dashboard/` | `#benchmark .bench-grid` row Cloudflare, column 7 (AI browser agents) | [site/assets/dashboard-data.mjs:551](site/assets/dashboard-data.mjs#L551) |
| 98.4% | Akamai catching Headless Chrome | `/` | `#benchmark table` row Akamai, column 1 (Headless Chrome) | [site/index.html:330](site/index.html#L330) |
| 98.4% | Akamai catching Headless Chrome | `/dashboard/` | `#benchmark .bench-grid` row Akamai, column 1 (Headless Chrome) | [site/assets/dashboard-data.mjs:552](site/assets/dashboard-data.mjs#L552) |
| 97.6% | Akamai catching Selenium | `/` | `#benchmark table` row Akamai, column 2 (Selenium) | [site/index.html:330](site/index.html#L330) |
| 97.6% | Akamai catching Selenium | `/dashboard/` | `#benchmark .bench-grid` row Akamai, column 2 (Selenium) | [site/assets/dashboard-data.mjs:552](site/assets/dashboard-data.mjs#L552) |
| 96.8% | Akamai catching Playwright | `/` | `#benchmark table` row Akamai, column 3 (Playwright) | [site/index.html:330](site/index.html#L330) |
| 96.8% | Akamai catching Playwright | `/dashboard/` | `#benchmark .bench-grid` row Akamai, column 3 (Playwright) | [site/assets/dashboard-data.mjs:552](site/assets/dashboard-data.mjs#L552) |
| 97.2% | Akamai catching Puppeteer | `/` | `#benchmark table` row Akamai, column 4 (Puppeteer) | [site/index.html:330](site/index.html#L330) |
| 97.2% | Akamai catching Puppeteer | `/dashboard/` | `#benchmark .bench-grid` row Akamai, column 4 (Puppeteer) | [site/assets/dashboard-data.mjs:552](site/assets/dashboard-data.mjs#L552) |
| 91.5% | Akamai catching Puppeteer Stealth | `/` | `#benchmark table` row Akamai, column 5 (Puppeteer Stealth) | [site/index.html:330](site/index.html#L330) |
| 91.5% | Akamai catching Puppeteer Stealth | `/dashboard/` | `#benchmark .bench-grid` row Akamai, column 5 (Puppeteer Stealth) | [site/assets/dashboard-data.mjs:552](site/assets/dashboard-data.mjs#L552) |
| 89.2% | Akamai catching undetected-chromedriver | `/` | `#benchmark table` row Akamai, column 6 (undetected-chromedriver) | [site/index.html:330](site/index.html#L330) |
| 89.2% | Akamai catching undetected-chromedriver | `/dashboard/` | `#benchmark .bench-grid` row Akamai, column 6 (undetected-chromedriver) | [site/assets/dashboard-data.mjs:552](site/assets/dashboard-data.mjs#L552) |
| 76.3% | Akamai catching AI browser agents | `/` | `#benchmark table` row Akamai, column 7 (AI browser agents) | [site/index.html:330](site/index.html#L330) |
| 76.3% | Akamai catching AI browser agents | `/dashboard/` | `#benchmark .bench-grid` row Akamai, column 7 (AI browser agents) | [site/assets/dashboard-data.mjs:552](site/assets/dashboard-data.mjs#L552) |
| 98.9% | DataDome catching Headless Chrome | `/` | `#benchmark table` row DataDome, column 1 (Headless Chrome) | [site/index.html:331](site/index.html#L331) |
| 98.9% | DataDome catching Headless Chrome | `/dashboard/` | `#benchmark .bench-grid` row DataDome, column 1 (Headless Chrome) | [site/assets/dashboard-data.mjs:553](site/assets/dashboard-data.mjs#L553) |
| 98.2% | DataDome catching Selenium | `/` | `#benchmark table` row DataDome, column 2 (Selenium) | [site/index.html:331](site/index.html#L331) |
| 98.2% | DataDome catching Selenium | `/dashboard/` | `#benchmark .bench-grid` row DataDome, column 2 (Selenium) | [site/assets/dashboard-data.mjs:553](site/assets/dashboard-data.mjs#L553) |
| 97.6% | DataDome catching Playwright | `/` | `#benchmark table` row DataDome, column 3 (Playwright) | [site/index.html:331](site/index.html#L331) |
| 97.6% | DataDome catching Playwright | `/dashboard/` | `#benchmark .bench-grid` row DataDome, column 3 (Playwright) | [site/assets/dashboard-data.mjs:553](site/assets/dashboard-data.mjs#L553) |
| 97.9% | DataDome catching Puppeteer | `/` | `#benchmark table` row DataDome, column 4 (Puppeteer) | [site/index.html:331](site/index.html#L331) |
| 97.9% | DataDome catching Puppeteer | `/dashboard/` | `#benchmark .bench-grid` row DataDome, column 4 (Puppeteer) | [site/assets/dashboard-data.mjs:553](site/assets/dashboard-data.mjs#L553) |
| 93.7% | DataDome catching Puppeteer Stealth | `/` | `#benchmark table` row DataDome, column 5 (Puppeteer Stealth) | [site/index.html:331](site/index.html#L331) |
| 93.7% | DataDome catching Puppeteer Stealth | `/dashboard/` | `#benchmark .bench-grid` row DataDome, column 5 (Puppeteer Stealth) | [site/assets/dashboard-data.mjs:553](site/assets/dashboard-data.mjs#L553) |
| 91.4% | DataDome catching undetected-chromedriver | `/` | `#benchmark table` row DataDome, column 6 (undetected-chromedriver) | [site/index.html:331](site/index.html#L331) |
| 91.4% | DataDome catching undetected-chromedriver | `/dashboard/` | `#benchmark .bench-grid` row DataDome, column 6 (undetected-chromedriver) | [site/assets/dashboard-data.mjs:553](site/assets/dashboard-data.mjs#L553) |
| 81.2% | DataDome catching AI browser agents | `/` | `#benchmark table` row DataDome, column 7 (AI browser agents) | [site/index.html:331](site/index.html#L331) |
| 81.2% | DataDome catching AI browser agents | `/dashboard/` | `#benchmark .bench-grid` row DataDome, column 7 (AI browser agents) | [site/assets/dashboard-data.mjs:553](site/assets/dashboard-data.mjs#L553) |
| 98.1% | HUMAN catching Headless Chrome | `/` | `#benchmark table` row HUMAN, column 1 (Headless Chrome) | [site/index.html:332](site/index.html#L332) |
| 98.1% | HUMAN catching Headless Chrome | `/dashboard/` | `#benchmark .bench-grid` row HUMAN, column 1 (Headless Chrome) | [site/assets/dashboard-data.mjs:554](site/assets/dashboard-data.mjs#L554) |
| 97.4% | HUMAN catching Selenium | `/` | `#benchmark table` row HUMAN, column 2 (Selenium) | [site/index.html:332](site/index.html#L332) |
| 97.4% | HUMAN catching Selenium | `/dashboard/` | `#benchmark .bench-grid` row HUMAN, column 2 (Selenium) | [site/assets/dashboard-data.mjs:554](site/assets/dashboard-data.mjs#L554) |
| 96.5% | HUMAN catching Playwright | `/` | `#benchmark table` row HUMAN, column 3 (Playwright) | [site/index.html:332](site/index.html#L332) |
| 96.5% | HUMAN catching Playwright | `/dashboard/` | `#benchmark .bench-grid` row HUMAN, column 3 (Playwright) | [site/assets/dashboard-data.mjs:554](site/assets/dashboard-data.mjs#L554) |
| 96.9% | HUMAN catching Puppeteer | `/` | `#benchmark table` row HUMAN, column 4 (Puppeteer) | [site/index.html:332](site/index.html#L332) |
| 96.9% | HUMAN catching Puppeteer | `/dashboard/` | `#benchmark .bench-grid` row HUMAN, column 4 (Puppeteer) | [site/assets/dashboard-data.mjs:554](site/assets/dashboard-data.mjs#L554) |
| 90.8% | HUMAN catching Puppeteer Stealth | `/` | `#benchmark table` row HUMAN, column 5 (Puppeteer Stealth) | [site/index.html:332](site/index.html#L332) |
| 90.8% | HUMAN catching Puppeteer Stealth | `/dashboard/` | `#benchmark .bench-grid` row HUMAN, column 5 (Puppeteer Stealth) | [site/assets/dashboard-data.mjs:554](site/assets/dashboard-data.mjs#L554) |
| 88.1% | HUMAN catching undetected-chromedriver | `/` | `#benchmark table` row HUMAN, column 6 (undetected-chromedriver) | [site/index.html:332](site/index.html#L332) |
| 88.1% | HUMAN catching undetected-chromedriver | `/dashboard/` | `#benchmark .bench-grid` row HUMAN, column 6 (undetected-chromedriver) | [site/assets/dashboard-data.mjs:554](site/assets/dashboard-data.mjs#L554) |
| 78.4% | HUMAN catching AI browser agents | `/` | `#benchmark table` row HUMAN, column 7 (AI browser agents) | [site/index.html:332](site/index.html#L332) |
| 78.4% | HUMAN catching AI browser agents | `/dashboard/` | `#benchmark .bench-grid` row HUMAN, column 7 (AI browser agents) | [site/assets/dashboard-data.mjs:554](site/assets/dashboard-data.mjs#L554) |
| 99.2% | Kasada catching Headless Chrome | `/` | `#benchmark table` row Kasada, column 1 (Headless Chrome) | [site/index.html:333](site/index.html#L333) |
| 99.2% | Kasada catching Headless Chrome | `/dashboard/` | `#benchmark .bench-grid` row Kasada, column 1 (Headless Chrome) | [site/assets/dashboard-data.mjs:555](site/assets/dashboard-data.mjs#L555) |
| 98.7% | Kasada catching Selenium | `/` | `#benchmark table` row Kasada, column 2 (Selenium) | [site/index.html:333](site/index.html#L333) |
| 98.7% | Kasada catching Selenium | `/dashboard/` | `#benchmark .bench-grid` row Kasada, column 2 (Selenium) | [site/assets/dashboard-data.mjs:555](site/assets/dashboard-data.mjs#L555) |
| 98.1% | Kasada catching Playwright | `/` | `#benchmark table` row Kasada, column 3 (Playwright) | [site/index.html:333](site/index.html#L333) |
| 98.1% | Kasada catching Playwright | `/dashboard/` | `#benchmark .bench-grid` row Kasada, column 3 (Playwright) | [site/assets/dashboard-data.mjs:555](site/assets/dashboard-data.mjs#L555) |
| 98.4% | Kasada catching Puppeteer | `/` | `#benchmark table` row Kasada, column 4 (Puppeteer) | [site/index.html:333](site/index.html#L333) |
| 98.4% | Kasada catching Puppeteer | `/dashboard/` | `#benchmark .bench-grid` row Kasada, column 4 (Puppeteer) | [site/assets/dashboard-data.mjs:555](site/assets/dashboard-data.mjs#L555) |
| 95.2% | Kasada catching Puppeteer Stealth | `/` | `#benchmark table` row Kasada, column 5 (Puppeteer Stealth) | [site/index.html:333](site/index.html#L333) |
| 95.2% | Kasada catching Puppeteer Stealth | `/dashboard/` | `#benchmark .bench-grid` row Kasada, column 5 (Puppeteer Stealth) | [site/assets/dashboard-data.mjs:555](site/assets/dashboard-data.mjs#L555) |
| 93.6% | Kasada catching undetected-chromedriver | `/` | `#benchmark table` row Kasada, column 6 (undetected-chromedriver) | [site/index.html:333](site/index.html#L333) |
| 93.6% | Kasada catching undetected-chromedriver | `/dashboard/` | `#benchmark .bench-grid` row Kasada, column 6 (undetected-chromedriver) | [site/assets/dashboard-data.mjs:555](site/assets/dashboard-data.mjs#L555) |
| 83.5% | Kasada catching AI browser agents | `/` | `#benchmark table` row Kasada, column 7 (AI browser agents) | [site/index.html:333](site/index.html#L333) |
| 83.5% | Kasada catching AI browser agents | `/dashboard/` | `#benchmark .bench-grid` row Kasada, column 7 (AI browser agents) | [site/assets/dashboard-data.mjs:555](site/assets/dashboard-data.mjs#L555) |
| 96.7% | Imperva catching Headless Chrome | `/` | `#benchmark table` row Imperva, column 1 (Headless Chrome) | [site/index.html:334](site/index.html#L334) |
| 96.7% | Imperva catching Headless Chrome | `/dashboard/` | `#benchmark .bench-grid` row Imperva, column 1 (Headless Chrome) | [site/assets/dashboard-data.mjs:556](site/assets/dashboard-data.mjs#L556) |
| 95.8% | Imperva catching Selenium | `/` | `#benchmark table` row Imperva, column 2 (Selenium) | [site/index.html:334](site/index.html#L334) |
| 95.8% | Imperva catching Selenium | `/dashboard/` | `#benchmark .bench-grid` row Imperva, column 2 (Selenium) | [site/assets/dashboard-data.mjs:556](site/assets/dashboard-data.mjs#L556) |
| 94.2% | Imperva catching Playwright | `/` | `#benchmark table` row Imperva, column 3 (Playwright) | [site/index.html:334](site/index.html#L334) |
| 94.2% | Imperva catching Playwright | `/dashboard/` | `#benchmark .bench-grid` row Imperva, column 3 (Playwright) | [site/assets/dashboard-data.mjs:556](site/assets/dashboard-data.mjs#L556) |
| 94.9% | Imperva catching Puppeteer | `/` | `#benchmark table` row Imperva, column 4 (Puppeteer) | [site/index.html:334](site/index.html#L334) |
| 94.9% | Imperva catching Puppeteer | `/dashboard/` | `#benchmark .bench-grid` row Imperva, column 4 (Puppeteer) | [site/assets/dashboard-data.mjs:556](site/assets/dashboard-data.mjs#L556) |
| 86.4% | Imperva catching Puppeteer Stealth | `/` | `#benchmark table` row Imperva, column 5 (Puppeteer Stealth) | [site/index.html:334](site/index.html#L334) |
| 86.4% | Imperva catching Puppeteer Stealth | `/dashboard/` | `#benchmark .bench-grid` row Imperva, column 5 (Puppeteer Stealth) | [site/assets/dashboard-data.mjs:556](site/assets/dashboard-data.mjs#L556) |
| 82.9% | Imperva catching undetected-chromedriver | `/` | `#benchmark table` row Imperva, column 6 (undetected-chromedriver) | [site/index.html:334](site/index.html#L334) |
| 82.9% | Imperva catching undetected-chromedriver | `/dashboard/` | `#benchmark .bench-grid` row Imperva, column 6 (undetected-chromedriver) | [site/assets/dashboard-data.mjs:556](site/assets/dashboard-data.mjs#L556) |
| 68.9% | Imperva catching AI browser agents | `/` | `#benchmark table` row Imperva, column 7 (AI browser agents) | [site/index.html:334](site/index.html#L334) |
| 68.9% | Imperva catching AI browser agents | `/dashboard/` | `#benchmark .bench-grid` row Imperva, column 7 (AI browser agents) | [site/assets/dashboard-data.mjs:556](site/assets/dashboard-data.mjs#L556) |
| 98.6% | F5 (Shape) catching Headless Chrome | `/` | `#benchmark table` row F5 (Shape), column 1 (Headless Chrome) | [site/index.html:335](site/index.html#L335) |
| 98.6% | F5 (Shape) catching Headless Chrome | `/dashboard/` | `#benchmark .bench-grid` row F5 (Shape), column 1 (Headless Chrome) | [site/assets/dashboard-data.mjs:557](site/assets/dashboard-data.mjs#L557) |
| 97.9% | F5 (Shape) catching Selenium | `/` | `#benchmark table` row F5 (Shape), column 2 (Selenium) | [site/index.html:335](site/index.html#L335) |
| 97.9% | F5 (Shape) catching Selenium | `/dashboard/` | `#benchmark .bench-grid` row F5 (Shape), column 2 (Selenium) | [site/assets/dashboard-data.mjs:557](site/assets/dashboard-data.mjs#L557) |
| 97.0% | F5 (Shape) catching Playwright | `/` | `#benchmark table` row F5 (Shape), column 3 (Playwright) | [site/index.html:335](site/index.html#L335) |
| 97.0% | F5 (Shape) catching Playwright | `/dashboard/` | `#benchmark .bench-grid` row F5 (Shape), column 3 (Playwright) | [site/assets/dashboard-data.mjs:557](site/assets/dashboard-data.mjs#L557) |
| 97.3% | F5 (Shape) catching Puppeteer | `/` | `#benchmark table` row F5 (Shape), column 4 (Puppeteer) | [site/index.html:335](site/index.html#L335) |
| 97.3% | F5 (Shape) catching Puppeteer | `/dashboard/` | `#benchmark .bench-grid` row F5 (Shape), column 4 (Puppeteer) | [site/assets/dashboard-data.mjs:557](site/assets/dashboard-data.mjs#L557) |
| 92.1% | F5 (Shape) catching Puppeteer Stealth | `/` | `#benchmark table` row F5 (Shape), column 5 (Puppeteer Stealth) | [site/index.html:335](site/index.html#L335) |
| 92.1% | F5 (Shape) catching Puppeteer Stealth | `/dashboard/` | `#benchmark .bench-grid` row F5 (Shape), column 5 (Puppeteer Stealth) | [site/assets/dashboard-data.mjs:557](site/assets/dashboard-data.mjs#L557) |
| 90.3% | F5 (Shape) catching undetected-chromedriver | `/` | `#benchmark table` row F5 (Shape), column 6 (undetected-chromedriver) | [site/index.html:335](site/index.html#L335) |
| 90.3% | F5 (Shape) catching undetected-chromedriver | `/dashboard/` | `#benchmark .bench-grid` row F5 (Shape), column 6 (undetected-chromedriver) | [site/assets/dashboard-data.mjs:557](site/assets/dashboard-data.mjs#L557) |
| 74.8% | F5 (Shape) catching AI browser agents | `/` | `#benchmark table` row F5 (Shape), column 7 (AI browser agents) | [site/index.html:335](site/index.html#L335) |
| 74.8% | F5 (Shape) catching AI browser agents | `/dashboard/` | `#benchmark .bench-grid` row F5 (Shape), column 7 (AI browser agents) | [site/assets/dashboard-data.mjs:557](site/assets/dashboard-data.mjs#L557) |
| 95.9% | Arkose Labs catching Headless Chrome | `/` | `#benchmark table` row Arkose Labs, column 1 (Headless Chrome) | [site/index.html:336](site/index.html#L336) |
| 95.9% | Arkose Labs catching Headless Chrome | `/dashboard/` | `#benchmark .bench-grid` row Arkose Labs, column 1 (Headless Chrome) | [site/assets/dashboard-data.mjs:558](site/assets/dashboard-data.mjs#L558) |
| 95.1% | Arkose Labs catching Selenium | `/` | `#benchmark table` row Arkose Labs, column 2 (Selenium) | [site/index.html:336](site/index.html#L336) |
| 95.1% | Arkose Labs catching Selenium | `/dashboard/` | `#benchmark .bench-grid` row Arkose Labs, column 2 (Selenium) | [site/assets/dashboard-data.mjs:558](site/assets/dashboard-data.mjs#L558) |
| 93.8% | Arkose Labs catching Playwright | `/` | `#benchmark table` row Arkose Labs, column 3 (Playwright) | [site/index.html:336](site/index.html#L336) |
| 93.8% | Arkose Labs catching Playwright | `/dashboard/` | `#benchmark .bench-grid` row Arkose Labs, column 3 (Playwright) | [site/assets/dashboard-data.mjs:558](site/assets/dashboard-data.mjs#L558) |
| 94.6% | Arkose Labs catching Puppeteer | `/` | `#benchmark table` row Arkose Labs, column 4 (Puppeteer) | [site/index.html:336](site/index.html#L336) |
| 94.6% | Arkose Labs catching Puppeteer | `/dashboard/` | `#benchmark .bench-grid` row Arkose Labs, column 4 (Puppeteer) | [site/assets/dashboard-data.mjs:558](site/assets/dashboard-data.mjs#L558) |
| 87.9% | Arkose Labs catching Puppeteer Stealth | `/` | `#benchmark table` row Arkose Labs, column 5 (Puppeteer Stealth) | [site/index.html:336](site/index.html#L336) |
| 87.9% | Arkose Labs catching Puppeteer Stealth | `/dashboard/` | `#benchmark .bench-grid` row Arkose Labs, column 5 (Puppeteer Stealth) | [site/assets/dashboard-data.mjs:558](site/assets/dashboard-data.mjs#L558) |
| 85.5% | Arkose Labs catching undetected-chromedriver | `/` | `#benchmark table` row Arkose Labs, column 6 (undetected-chromedriver) | [site/index.html:336](site/index.html#L336) |
| 85.5% | Arkose Labs catching undetected-chromedriver | `/dashboard/` | `#benchmark .bench-grid` row Arkose Labs, column 6 (undetected-chromedriver) | [site/assets/dashboard-data.mjs:558](site/assets/dashboard-data.mjs#L558) |
| 79.1% | Arkose Labs catching AI browser agents | `/` | `#benchmark table` row Arkose Labs, column 7 (AI browser agents) | [site/index.html:336](site/index.html#L336) |
| 79.1% | Arkose Labs catching AI browser agents | `/dashboard/` | `#benchmark .bench-grid` row Arkose Labs, column 7 (AI browser agents) | [site/assets/dashboard-data.mjs:558](site/assets/dashboard-data.mjs#L558) |
| 2,000 | sessions per vendor: Headless Chrome | `/` | `#benchmark tfoot` column 1 | [site/index.html:339](site/index.html#L339) |
| 2,000 | sessions per vendor: Headless Chrome | `/dashboard/` | `#benchmark .bench-grid tfoot` column 1 | [site/assets/dashboard-data.mjs:541](site/assets/dashboard-data.mjs#L541) |
| 2,000 | sessions per vendor: Selenium | `/` | `#benchmark tfoot` column 2 | [site/index.html:339](site/index.html#L339) |
| 2,000 | sessions per vendor: Selenium | `/dashboard/` | `#benchmark .bench-grid tfoot` column 2 | [site/assets/dashboard-data.mjs:542](site/assets/dashboard-data.mjs#L542) |
| 2,000 | sessions per vendor: Playwright | `/` | `#benchmark tfoot` column 3 | [site/index.html:339](site/index.html#L339) |
| 2,000 | sessions per vendor: Playwright | `/dashboard/` | `#benchmark .bench-grid tfoot` column 3 | [site/assets/dashboard-data.mjs:543](site/assets/dashboard-data.mjs#L543) |
| 2,000 | sessions per vendor: Puppeteer | `/` | `#benchmark tfoot` column 4 | [site/index.html:339](site/index.html#L339) |
| 2,000 | sessions per vendor: Puppeteer | `/dashboard/` | `#benchmark .bench-grid tfoot` column 4 | [site/assets/dashboard-data.mjs:544](site/assets/dashboard-data.mjs#L544) |
| 2,000 | sessions per vendor: Puppeteer Stealth | `/` | `#benchmark tfoot` column 5 | [site/index.html:339](site/index.html#L339) |
| 2,000 | sessions per vendor: Puppeteer Stealth | `/dashboard/` | `#benchmark .bench-grid tfoot` column 5 | [site/assets/dashboard-data.mjs:545](site/assets/dashboard-data.mjs#L545) |
| 2,000 | sessions per vendor: undetected-chromedriver | `/` | `#benchmark tfoot` column 6 | [site/index.html:339](site/index.html#L339) |
| 2,000 | sessions per vendor: undetected-chromedriver | `/dashboard/` | `#benchmark .bench-grid tfoot` column 6 | [site/assets/dashboard-data.mjs:546](site/assets/dashboard-data.mjs#L546) |
| 500 | sessions per vendor: AI browser agents | `/` | `#benchmark tfoot` column 7 | [site/index.html:339](site/index.html#L339) |
| 500 | sessions per vendor: AI browser agents | `/dashboard/` | `#benchmark .bench-grid tfoot` column 7 | [site/assets/dashboard-data.mjs:547](site/assets/dashboard-data.mjs#L547) |

## Digits in names

The mock-figures gate reads every digit inside a marked figure, so the vendor name in the grid's row headers is listed too. It is a name, not a figure.

| Figure | What it stands for | Page | Selector | Source file:line |
| --- | --- | --- | --- | --- |
| F5 (Shape) | vendor row header, not a figure | `/` | `#benchmark table` row header | [site/index.html:335](site/index.html#L335) |
| F5 (Shape) | vendor row header, not a figure | `/dashboard/` | `#benchmark .bench-grid` row header | [site/assets/dashboard-data.mjs:557](site/assets/dashboard-data.mjs#L557) |

## Home hero: console tile (removed)

The console tile that sat over the home page's decision log (41,208 sessions, 3,914 stopped, 1,206 challenged) was removed on 2026-11-24 with the decision log itself (audit #9: the gate and the decision log told the same story twice, and the tile's numbers disagreed with the console's).

## Mocked text

- **The method paragraph** (`/` `#benchmark .bench-method`, [site/index.html:345](site/index.html#L345)) describes how the figures would be produced: each tool against the same test origin, protected in turn by each product in its default configuration, caught before the third protected request, people on the same origin as the control, a right of reply for every vendor. No such run has happened.
- **The console's benchmark intro** (`/dashboard/` `#benchmark .bench-h`, [site/assets/dashboard-data.mjs:575](site/assets/dashboard-data.mjs#L575)) says the same in short.

## Not covered here

- **Console sample data.** The rest of the console preview (`/dashboard/`) is generated from a fixed seed in `site/assets/dashboard-data.mjs` and labelled "Sample data" on the page. It is not listed figure by figure here.
- **The comparison page** (`/field/`) cites public sources for every vendor claim through `claims.yaml`. It has no benchmark figures.

## First screen and top bar (2026-11-19)

The home page's first-screen console is sample figures too. It sits in `figure.fs-console[data-mock]` with the sample note in its caption. Since 2026-11-24 (audit #9) its counts are the console's own sample data for shop.example.com over the last 24 hours (`siteData()` in `site/assets/dashboard-data.mjs`), so the hero, the console picture and `/dashboard/` show one dataset; `test/story.test.mjs` fails when they drift. (The sample GitHub star count that was in the top bar was removed on 2026-11-24, audit #11: the footer and the open-source section link the real repository instead.)

| Page | Figure | What it stands for | Selector | Source file:line |
| --- | --- | --- | --- | --- |
| `/` | last 24 h | the window the hero console covers, as in the console | `.fs-bar` | [site/index.html:38](site/index.html#L38) |
| `/` | 55,342 sessions | sessions in the last 24 hours, all verdicts (42,143 + 11,742 + 766 + 691); the console's Sessions card | `.fs-sum` (1st) | [site/index.html:40](site/index.html#L40) |
| `/` | 42,143 allowed | sessions allowed: sessions less those challenged, throttled and blocked | `.fs-sum .v-allow` | [site/index.html:41](site/index.html#L41) |
| `/` | 11,742 challenged | challenges issued (proof-of-work 10,582 + human check 1,160); the console's Challenges card | `.fs-sum .v-challenge` | [site/index.html:42](site/index.html#L42) |
| `/` | 766 throttled | sessions throttled once no grant was left | `.fs-sum .v-rate` | [site/index.html:43](site/index.html#L43) |
| `/` | 691 blocked | sessions blocked (766 + 691 = the console's 1,457 throttled or blocked) | `.fs-sum .v-block` | [site/index.html:44](site/index.html#L44) |
| `/` | 22 inputs, proof-of-work in 380 ms | the human row | `.fs-rows li` (1st) | [site/index.html:47](site/index.html#L47) |
| `/` | 40 product pages in a minute | the scraper row | `.fs-rows li` (2nd) | [site/index.html:48](site/index.html#L48) |
| `/` | no input after 30 requests | the headless browser row | `.fs-rows li` (3rd) | [site/index.html:49](site/index.html#L49) |
| `/` | throttle 429 | the AI agent row's verdict (HTTP status) | `.fs-rows li` (4th) | [site/index.html:50](site/index.html#L50) |

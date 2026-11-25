// Measured in a browser (audit B2: #13, #15, #17, #19). At 1440px the headings of cards in one row
// line up. On phones (390 and 360) the policy file and the Cloud plans table fit the screen, the
// console picture is the phone crop, and every link or control that stands on its own is at least
// 44px each way (links inside running text keep the line; footnote numbers carry a 44px area).
// No page logs a console error from the site's own code. Needs Playwright with Chromium, found as in
// header-width.test.mjs; without it the test is skipped.
import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { extname, join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
if (!existsSync(join(dist, "index.html"))) {
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });
}

async function loadPlaywright() {
  const tries = [
    () => import("playwright"),
    () => process.env.PLAYWRIGHT_MODULE && createRequire(process.env.PLAYWRIGHT_MODULE)("playwright"),
    () => createRequire(join(homedir(), "workspace/botrampart/greenhouse/package.json"))("playwright"),
  ];
  for (const t of tries) {
    try {
      const m = await t();
      if (m?.chromium) return m;
      if (m?.default?.chromium) return m.default;
    } catch { /* next */ }
  }
  return null;
}
const pw = await loadPlaywright();
let browser = null;
if (pw) {
  try { browser = await pw.chromium.launch(); } catch { browser = null; }
}
const skip = browser ? false : "Playwright with Chromium is not installed";

// A static server for dist/ with Cloudflare Pages' directory rule (/a/ -> /a/index.html).
const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webp": "image/webp", ".png": "image/png", ".ico": "image/x-icon" };
const server = createServer((req, res) => {
  let p = join(dist, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream" });
  res.end(readFileSync(p));
});
const base = await new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(`http://127.0.0.1:${server.address().port}`)));

const PAGES = ["/", "/own/", "/meter/", "/field/", "/autoinstall/", "/try/", "/access/", "/signin/", "/signup/", "/dashboard/", "/solutions/", "/solutions/commerce/", "/solutions/saas/", "/solutions/publishers/", "/solutions/accounts/", "/404.html"];

test("1440px: card headings in one row sit at the same height", { skip }, async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const [path, sel] of [["/", ".prod-grid"], ["/", ".plans"], ["/own/", ".editions"], ["/solutions/", ".cards"]]) {
    await page.goto(base + path);
    const rows = await page.evaluate((sel) => [...document.querySelectorAll(sel)].map((grid) => {
      const byRow = new Map();
      for (const card of grid.querySelectorAll(":scope > li > a, :scope > a, :scope > div")) {
        const h = card.querySelector("h3, b");
        if (!h) continue;
        const top = Math.round(card.getBoundingClientRect().top);
        (byRow.get(top) ?? byRow.set(top, []).get(top)).push(Math.round(h.getBoundingClientRect().top) - top);
      }
      return [...byRow.values()];
    }), sel);
    assert.ok(rows.length, `${path} ${sel} found`);
    for (const row of rows.flat()) assert.equal(new Set(row).size, 1, `${path} ${sel}: heading offsets ${row.join(", ")}`);
  }
  await page.close();
});

test("phones: the policy file, the Cloud plans table and the console picture fit and read (#13)", { skip }, async () => {
  for (const [width, height] of [[390, 844], [360, 800]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(base + "/");
    const pre = await page.locator(".policy-code pre").evaluate((e) => [e.scrollWidth, e.clientWidth]);
    assert.ok(pre[0] <= pre[1] + 1, `${width}px: policy file ${pre[0]}px in ${pre[1]}px`);
    const img = page.locator(".shot img");
    await img.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector(".shot img").complete);
    const shot = await img.evaluate((e) => ({ src: e.currentSrc, w: e.getBoundingClientRect().width, h: e.getBoundingClientRect().height }));
    assert.match(shot.src, /dashboard-phone\.[0-9a-f]{10}\.webp$/, `${width}px: the phone crop of the console`);
    assert.ok(shot.w >= 300 && shot.h > shot.w, `${width}px: console picture ${Math.round(shot.w)}x${Math.round(shot.h)}`);
    await page.goto(base + "/own/");
    const table = await page.locator(".plan-table").evaluate((e) => ({ sw: e.scrollWidth, cw: e.clientWidth, cells: [...e.querySelectorAll("td")].map((td) => { const r = td.getBoundingClientRect(); return [r.left, r.right]; }) }));
    assert.ok(table.sw <= table.cw + 1, `${width}px: Cloud plans ${table.sw}px in ${table.cw}px`);
    assert.equal(table.cells.length, 16);
    for (const [l, r] of table.cells) assert.ok(l >= 0 && r <= width, `${width}px: a Cloud plans cell at ${Math.round(l)}–${Math.round(r)}`);
    assert.equal(await page.locator(".plan-table td").first().evaluate((e) => getComputedStyle(e, "::before").content), '"Monthly fee"', "each figure is labelled");
    await ctx.close();
  }
});

test("phones: links and controls that stand alone are at least 44px each way (#17)", { skip }, async () => {
  for (const [width, height] of [[390, 844], [360, 800]]) {
    const ctx = await browser.newContext({ viewport: { width, height }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    for (const path of PAGES) {
      await page.goto(base + path);
      for (const open of [false, true]) {
        if (open) await page.evaluate(() => document.querySelector("[data-phone-menu]")?.setAttribute("open", ""));
        const small = await page.evaluate(() => {
          // A link inside a sentence keeps the line's height (WCAG 2.5.8's inline exception).
          const inSentence = (el) => {
            const blk = el.closest("p, li, td, dd, figcaption, q, blockquote");
            return !!blk && blk.textContent.replace(/\s+/g, " ").trim().length > el.textContent.trim().length + 12;
          };
          const out = [];
          for (const el of document.querySelectorAll("a[href], button, summary, input, select, label.choice")) {
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height || getComputedStyle(el).visibility === "hidden") continue;
            if (el.closest("[hidden], details:not([open]) > :not(summary)")) continue;
            if (el.closest("sup.ref")) {
              const a = getComputedStyle(el, "::after");
              if (parseFloat(a.width) >= 44 && parseFloat(a.height) >= 44) continue;
            }
            if ((r.height < 43.5 || r.width < 43.5) && !inSentence(el)) out.push(`"${(el.textContent || el.getAttribute("aria-label") || el.name || "").trim().slice(0, 30)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
          }
          return out;
        });
        assert.deepEqual(small, [], `${width}px ${path}${open ? " (Menu open)" : ""}: targets under 44px`);
      }
    }
    await ctx.close();
  }
});

test("no page logs a console error from the site's own code (#19)", { skip }, async () => {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("console", (m) => { if (m.type() === "error") errors.push(`${page.url()}: ${m.text()}`); });
    page.on("pageerror", (e) => errors.push(`${page.url()}: ${e.message}`));
    for (const path of [...PAGES, "/docs/"]) await page.goto(base + path, { waitUntil: "load" });
    assert.deepEqual(errors, [], `${viewport.width}px`);
    await page.close();
  }
});

test.after(async () => {
  await browser?.close();
  server.close();
});

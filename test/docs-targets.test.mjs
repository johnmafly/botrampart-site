// Measured in a browser on a phone (390x844 and 360x800): every docs control outside running text
// is a target at least 44px wide and 44px high (audit #17): the header's search and theme buttons,
// View as Markdown, Copy page and its menu, the docs menu's links, each code block's Copy button
// and "op" link, tabs, the page-end links and the search dialog's close button. Links inside a
// sentence are text, not targets, and are not measured. The first command stays in the first
// screen and nothing scrolls sideways.
// Needs Playwright with Chromium, found the way test/header-width.test.mjs finds it; skipped without.
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

const TYPES = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".mjs": "text/javascript", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".md": "text/markdown; charset=utf-8", ".json": "application/json" };
const server = createServer((req, res) => {
  let p = join(dist, decodeURIComponent(new URL(req.url, "http://x").pathname));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, "index.html");
  if (!existsSync(p)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { "content-type": TYPES[extname(p)] ?? "application/octet-stream" });
  res.end(readFileSync(p));
});
const base = await new Promise((ok) => server.listen(0, "127.0.0.1", () => ok(`http://127.0.0.1:${server.address().port}`)));

const PAGES = ["/docs/", "/docs/getting-started/", "/docs/api/", "/docs/autoinstall/", "/docs/policy/"];
const PHONES = [{ width: 390, height: 844 }, { width: 360, height: 800 }];

// Every visible link, button, summary and field that is not a link inside running text and is
// under 44px in either direction, as "where: tag.class WxH".
const small = () => {
  const vis = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0 && el.checkVisibility();
  };
  const chrome = ".docs-side, .docs-toc, nav, .foot, .cp-menu, .nextsteps, .cards, .doc-meta, .doc-tools, header";
  const inText = (el) => el.tagName === "A" && !!el.closest("p, li, td, th, dd, dt, figcaption, h1, h2, h3, h4, blockquote") && !el.closest(chrome);
  const out = [];
  for (const el of document.querySelectorAll("a, button, summary, input, select")) {
    if (!vis(el) || inText(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width >= 43.9 && r.height >= 43.9) continue;
    if (el.matches(".foot .brand")) continue; // the footer logo: 44px high, the mark's own width (site.css)
    out.push(`${el.tagName.toLowerCase()}.${String(el.className).split(" ")[0] || el.textContent.trim().slice(0, 24)} ${Math.round(r.width)}x${Math.round(r.height)}`);
  }
  return [...new Set(out)];
};
const fits = () => {
  const pre = document.querySelector("article pre")?.getBoundingClientRect();
  return { scrollWidth: document.documentElement.scrollWidth, innerWidth, firstCommandBottom: pre?.bottom ?? null };
};

test("on a phone every docs control outside running text is at least 44px by 44px", { skip }, async () => {
  for (const viewport of PHONES) {
    const ctx = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    const page = await ctx.newPage();
    for (const path of PAGES) {
      await page.goto(base + path, { waitUntil: "networkidle" });
      const at = `${path} at ${viewport.width}px`;
      assert.deepEqual(await page.evaluate(small), [], `${at}: targets under 44px`);
      const f = await page.evaluate(fits);
      assert.ok(f.scrollWidth <= f.innerWidth, `${at}: scrolls sideways`);
      if (path === "/docs/" || path === "/docs/getting-started/") assert.ok(f.firstCommandBottom <= viewport.height, `${at}: the first command ends at ${f.firstCommandBottom}px, below the first screen`);
    }
    // Open states on the quickstart: the docs menu, the Copy page menu and search with results.
    await page.goto(base + "/docs/getting-started/", { waitUntil: "networkidle" });
    const at = `/docs/getting-started/ at ${viewport.width}px`;
    await page.click(".docs-side summary");
    assert.ok(await page.locator(".docs-side .gn-compact .sg a").count() >= 19, `${at}: the docs menu lists every page`);
    assert.deepEqual(await page.evaluate(small), [], `${at}, docs menu open: targets under 44px`);
    await page.click(".docs-side summary");
    await page.click(".cp-more summary");
    assert.deepEqual(await page.evaluate(small), [], `${at}, Copy page menu open: targets under 44px`);
    await page.keyboard.press("Escape");
    await page.click("[data-search-open]");
    await page.fill(".sd-input", "budget");
    await page.waitForSelector(".sd-list a");
    assert.deepEqual(await page.evaluate(small), [], `${at}, search open: targets under 44px`);
    await ctx.close();
  }
});

test("at 360px the header's search and theme buttons are 44px targets in one row with the rest", { skip }, async () => {
  for (const width of [360, 375, 380, 381, 390]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    await page.goto(base + "/docs/", { waitUntil: "networkidle" });
    const boxes = await page.evaluate(() => [...document.querySelectorAll(".top-row .brand, .top-row .search-btn, .top-row .theme-btn, .top-row .cta-pill, .top-row .m-menu summary")].map((e) => { const r = e.getBoundingClientRect(); return { name: String(e.className).split(" ")[0] || e.tagName, left: r.left, right: r.right, top: r.top, width: r.width, height: r.height }; }));
    assert.equal(boxes.length, 5, `${width}px: brand, search, theme, the main button and Menu`);
    for (const [i, b] of boxes.entries()) {
      assert.ok(b.width >= 43.9 && b.height >= 43.9, `${width}px: ${b.name} is ${b.width}x${b.height}`);
      assert.ok(b.left >= 0 && b.right <= width + 0.5, `${width}px: ${b.name} is cut off (${b.left} to ${b.right})`);
      if (i) assert.ok(b.left >= boxes[i - 1].right - 0.5, `${width}px: ${b.name} overlaps ${boxes[i - 1].name}`);
      assert.ok(Math.abs(b.top + b.height / 2 - (boxes[0].top + boxes[0].height / 2)) < 1, `${width}px: ${b.name} is not on the header's row`);
    }
    await ctx.close();
  }
});

test.after(async () => {
  await browser?.close();
  server.close();
});

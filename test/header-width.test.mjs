// Measured in a browser (audit #4, #5, #17 and #1): at 900, 1024, 1100 and 1179px no page scrolls
// sideways and every header control sits inside the viewport; on a phone the header is one row with
// the Menu button, and its targets are at least 44px; "Get a demo" is on screen on every page and
// goes to /access/, whose first action is visible without scrolling. Needs Playwright with Chromium:
// CI installs it (.github/workflows/check.yml); locally it is found in node_modules, in
// PLAYWRIGHT_MODULE, or in a greenhouse checkout next to this one. Without it the test is skipped.
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

const MARKETING = ["/", "/own/", "/solutions/", "/solutions/commerce/", "/meter/", "/field/", "/autoinstall/", "/access/", "/signin/", "/signup/", "/dashboard/", "/try/"];
const EVERY = [...MARKETING, "/docs/", "/docs/getting-started/"];

// Header controls a person can see: their boxes, and the page's scroll width.
const measure = () => {
  const vis = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0 && !el.closest("[hidden], details:not([open]) > :not(summary)");
  };
  const controls = [...document.querySelectorAll(".top a, .top summary, .top button")].filter(vis).map((el) => {
    const r = el.getBoundingClientRect();
    return { docsTool: !!el.closest(".docs-tools"), label: (el.textContent || el.getAttribute("aria-label") || "").trim().replace(/\s+/g, " ").slice(0, 30), left: r.left, right: r.right, top: r.top, bottom: r.bottom, width: r.width, height: r.height };
  });
  const demo = [...document.querySelectorAll("a")].filter((a) => a.textContent.replace(/[→\s]+/g, " ").trim() === "Get a demo" && vis(a)).map((a) => ({ href: a.getAttribute("href"), top: a.getBoundingClientRect().top }));
  return { scrollWidth: document.documentElement.scrollWidth, innerWidth, header: document.querySelector(".top").getBoundingClientRect().height, controls, demo };
};

test("header at 900, 1024, 1100 and 1179px: no sideways scroll, every control inside the viewport", { skip }, async () => {
  for (const width of [900, 1024, 1100, 1179]) {
    const page = await browser.newPage({ viewport: { width, height: 800 } });
    for (const path of EVERY) {
      await page.goto(base + path);
      const m = await page.evaluate(measure);
      assert.ok(m.scrollWidth <= m.innerWidth, `${width}px ${path}: page is ${m.scrollWidth}px wide`);
      for (const c of m.controls) assert.ok(c.left >= 0 && c.right <= width, `${width}px ${path}: "${c.label}" at ${Math.round(c.left)}–${Math.round(c.right)}`);
      assert.ok(m.controls.some((c) => c.label === "Menu"), `${width}px ${path}: the Menu button`);
      assert.ok(m.demo.some((d) => d.href === "/access/" && d.top < 80), `${width}px ${path}: Get a demo in the header`);
    }
    await page.close();
  }
});

test("1440px: the full menu fits, Get a demo is in the header, no Menu button", { skip }, async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  for (const path of EVERY) {
    await page.goto(base + path);
    const m = await page.evaluate(measure);
    assert.ok(m.scrollWidth <= 1440, `${path}: page is ${m.scrollWidth}px wide`);
    for (const c of m.controls) assert.ok(c.left >= 0 && c.right <= 1440, `${path}: "${c.label}"`);
    assert.ok(!m.controls.some((c) => c.label === "Menu"), `${path}: no Menu button on a wide screen`);
    assert.ok(m.controls.some((c) => c.label === "Product"), `${path}: the Product menu`);
    assert.ok(m.demo.some((d) => d.href === "/access/" && d.top < 80), `${path}: Get a demo in the header`);
  }
  await page.close();
});

test("phones (390 and 360): one header row with the Menu button, and 44px header targets", { skip }, async () => {
  for (const [width, height] of [[390, 844], [360, 800]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    for (const path of EVERY) {
      await page.goto(base + path);
      const m = await page.evaluate(measure);
      assert.ok(m.scrollWidth <= width, `${width}px ${path}: page is ${m.scrollWidth}px wide`);
      assert.ok(m.header <= 64, `${width}px ${path}: header is ${m.header}px tall (one row)`);
      // The docs' search and theme buttons are sized in docs.css (the docs redesign, PR C).
      for (const c of m.controls.filter((c) => !c.docsTool)) {
        assert.ok(c.height >= 44 && c.width >= 44, `${width}px ${path}: "${c.label}" is ${Math.round(c.width)}x${Math.round(c.height)}`);
        assert.ok(c.left >= 0 && c.right <= width, `${width}px ${path}: "${c.label}" off screen`);
      }
      assert.ok(m.demo.some((d) => d.href === "/access/"), `${width}px ${path}: Get a demo on screen`);
      // The Menu opens without JavaScript's help (a <details>) and lists Sign in.
      await page.click(".m-menu > summary");
      assert.ok(await page.locator(".pm-panel a[href='/signin/']").isVisible(), `${width}px ${path}: Sign in in the open Menu`);
      await page.keyboard.press("Escape");
    }
    await page.close();
  }
});

test("phones (390 and 360): footer bar links are 44px tall and do not touch", { skip }, async () => {
  for (const [width, height] of [[390, 844], [360, 800]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    for (const path of ["/", "/access/", "/docs/"]) {
      await page.goto(base + path);
      const links = await page.evaluate(() => [...document.querySelectorAll(".foot-bar a")].map((a) => { const r = a.getBoundingClientRect(); return { label: a.textContent.trim(), left: r.left, right: r.right, top: Math.round(r.top), height: r.height }; }));
      assert.ok(links.length >= 4, `${width}px ${path}: ${links.length} footer bar links`);
      for (const l of links) assert.ok(l.height >= 44, `${width}px ${path}: "${l.label}" is ${Math.round(l.height)}px tall`);
      for (let i = 1; i < links.length; i++) {
        if (links[i].top !== links[i - 1].top) continue;
        const space = links[i].left - links[i - 1].right;
        assert.ok(space >= 16, `${width}px ${path}: "${links[i - 1].label}" and "${links[i].label}" are ${Math.round(space)}px apart`);
      }
    }
    await page.close();
  }
});

// Docs pages hide the logo's wordmark on phones (docs.css), so the footer logo there is the 30px
// mark alone: its link still has to be a 44x44 target.
test("phones (390 and 360): every footer link is at least 44x44, on marketing and docs pages", { skip }, async () => {
  for (const [width, height] of [[390, 844], [360, 800]]) {
    const page = await browser.newPage({ viewport: { width, height }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
    for (const path of [...EVERY, "/docs/api/", "/docs/agents/"]) {
      await page.goto(base + path);
      const links = await page.evaluate(() => [...document.querySelectorAll("footer a")].filter((a) => a.getClientRects().length).map((a) => { const r = a.getBoundingClientRect(); return { label: (a.textContent.trim() || a.getAttribute("aria-label") || "").slice(0, 30), width: r.width, height: r.height }; }));
      assert.ok(links.length >= 10, `${width}px ${path}: ${links.length} footer links`);
      for (const l of links) assert.ok(l.width >= 44 && l.height >= 44, `${width}px ${path}: footer "${l.label}" is ${Math.round(l.width)}x${Math.round(l.height)}px`);
    }
    await page.close();
  }
});

test("/access/: the first action is visible without scrolling at 1440 and on phones", { skip }, async () => {
  for (const [width, height] of [[1440, 900], [390, 844], [360, 800]]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto(base + "/access/");
    const box = await page.locator(".page-head .btn-primary").boundingBox();
    assert.ok(box && box.y + box.height <= height, `${width}px: Get a demo on GitHub at ${box && Math.round(box.y)}px`);
    assert.equal((await page.locator(".page-head .btn-primary").textContent()).replace(/[→\s]+/g, " ").trim(), "Get a demo on GitHub");
    await page.close();
  }
});

test("desktop menus: opening one closes the other; Escape and a click outside close them", { skip }, async () => {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(base + "/own/");
  const [product, solutions] = [page.locator("details[data-menu]").nth(0), page.locator("details[data-menu]").nth(1)];
  await product.locator("summary").click();
  await solutions.locator("summary").click();
  assert.deepEqual([await product.evaluate((d) => d.open), await solutions.evaluate((d) => d.open)], [false, true], "one open at a time");
  await page.keyboard.press("Escape");
  assert.equal(await solutions.evaluate((d) => d.open), false, "Escape closes it");
  assert.equal(await page.evaluate(() => document.activeElement?.textContent.trim()), "Solutions", "focus returns to its button");
  await product.locator("summary").click();
  await page.mouse.click(700, 600);
  assert.equal(await product.evaluate((d) => d.open), false, "a click outside closes it");
  await page.close();
});

test.after(async () => {
  await browser?.close();
  server.close();
});

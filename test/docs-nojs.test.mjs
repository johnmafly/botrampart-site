// Measured in a browser with JavaScript off: the docs show no control that does nothing. The copy
// buttons (Copy page, Copy prompt) need docs.js, so they are gone; each prompt card shows a link
// to the Markdown page that prints its prompt, at least 44px high, and on the docs home that link
// is in the first screen. With JavaScript on, the buttons show and the link does not.
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

// Pages with a prompt card, and one without.
const PAGES = { "/docs/": "/docs/agents.md", "/docs/getting-started/": "/docs/agents.md", "/docs/agents/": "/docs/agents.md", "/docs/autoinstall/": "/docs/autoinstall.md", "/docs/api/": null };
const VIEWPORTS = [{ width: 1440, height: 900 }, { width: 390, height: 844 }, { width: 360, height: 800 }];

// What a person can see: every button, the prompt link and the two Markdown routes.
const measure = () => {
  const vis = (el) => {
    const s = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return s.display !== "none" && s.visibility !== "hidden" && r.width > 0 && r.height > 0;
  };
  const shown = (sel) => [...document.querySelectorAll(sel)].filter(vis);
  const link = shown("article a.btn-copy-prompt")[0];
  const r = link?.getBoundingClientRect();
  return {
    buttons: shown("header button, main button").map((b) => b.className || b.textContent.trim()),
    link: link ? { text: link.textContent, href: link.getAttribute("href"), bottom: r.bottom, height: r.height } : null,
    viewAsMarkdown: shown(".md-link").length, menu: shown(".cp-more summary").length,
    scrollWidth: document.documentElement.scrollWidth, innerWidth,
  };
};

test("JavaScript off: no button shows, and each prompt card links the Markdown that prints its prompt", { skip }, async () => {
  for (const viewport of VIEWPORTS) {
    const ctx = await browser.newContext({ viewport, javaScriptEnabled: false, isMobile: viewport.width < 600, hasTouch: viewport.width < 600 });
    const page = await ctx.newPage();
    for (const [path, md] of Object.entries(PAGES)) {
      await page.goto(base + path);
      const m = await page.evaluate(measure);
      const at = `${path} at ${viewport.width}px`;
      assert.deepEqual(m.buttons, [], `${at}: a button that needs JavaScript is visible`);
      assert.equal(m.viewAsMarkdown, 1, `${at}: View as Markdown`);
      assert.equal(m.menu, 1, `${at}: the page menu, which works without JavaScript`);
      assert.ok(m.scrollWidth <= m.innerWidth, `${at}: scrolls sideways`);
      if (!md) { assert.equal(m.link, null, `${at}: no prompt card, no link`); continue; }
      assert.ok(m.link, `${at}: the prompt card shows no link`);
      assert.equal(m.link.text, "Read the prompt", at);
      assert.equal(m.link.href, md, at);
      assert.ok(m.link.height >= 44, `${at}: the link is ${m.link.height}px high`);
      if (path === "/docs/") assert.ok(m.link.bottom <= viewport.height, `${at}: the link is below the first screen`);
    }
    await ctx.close();
  }
});

test("JavaScript on: Copy page and Copy prompt show, and the no-JavaScript link does not", { skip }, async () => {
  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({ viewport });
    for (const [path, md] of Object.entries(PAGES)) {
      await page.goto(base + path, { waitUntil: "networkidle" });
      const m = await page.evaluate(measure);
      const at = `${path} at ${viewport.width}px`;
      assert.equal(m.link, null, `${at}: the no-JavaScript link shows`);
      assert.ok(m.buttons.includes("cp-main"), `${at}: Copy page`);
      assert.equal(m.buttons.includes("btn-copy-prompt"), !!md, `${at}: Copy prompt`);
    }
    await page.close();
  }
});

test.after(async () => {
  await browser?.close();
  server.close();
});

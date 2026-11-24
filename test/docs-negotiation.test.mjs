// Content negotiation for the docs (functions/docs/_middleware.js, a Cloudflare Pages Function):
// a request for a docs page's own address with "Accept: text/markdown" gets the page's Markdown;
// every other request reaches the static file unchanged. The function is run here against the
// built site, with the static files standing in for Pages' asset server.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { listPages } from "../scripts/docs.mjs";
import { onRequest, quality, wantsMarkdown, markdownPath } from "../functions/docs/_middleware.js";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
if (!existsSync(join(dist, "docs", "index.html"))) execFileSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });
const pages = listPages(join(root, "site", "docs"));
const ORIGIN = "https://botrampart.agenthatch.ai";

// The 301s Pages applies before it serves a file (dist/_redirects: "from to status").
const redirects = new Map(readFileSync(join(dist, "_redirects"), "utf8").split("\n").map((l) => l.trim().split(/\s+/)).filter((r) => r.length >= 2 && r[0].startsWith("/") && !r[0].includes("*")).map(([from, to]) => [from, to]));

// A stand-in for Pages: serves dist/ the way the asset server does for the paths the function asks
// for. Like Pages, it answers a moved address with a 301, and a fetch that follows redirects (the
// default) gets the file at the new address instead.
const asset = (pathname, follow = false) => {
  if (redirects.has(pathname)) {
    const to = redirects.get(pathname);
    if (follow) { const res = asset(to); Object.defineProperty(res, "redirected", { value: true }); return res; }
    return new Response(null, { status: 301, headers: { Location: to } });
  }
  const file = pathname.endsWith("/") ? join(dist, pathname, "index.html") : join(dist, pathname);
  if (!existsSync(file)) return new Response("not found", { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
  const type = file.endsWith(".md") ? "text/markdown; charset=utf-8" : file.endsWith(".html") ? "text/html; charset=utf-8" : "text/plain; charset=utf-8";
  return new Response(readFileSync(file), { status: 200, headers: { "Content-Type": type, "X-Robots-Tag": "noindex, nofollow" } });
};
const call = async (path, { accept, method = "GET" } = {}) => {
  const request = new Request(ORIGIN + path, { method, headers: accept ? { Accept: accept } : {} });
  let passed = false, guarded = false;
  const res = await onRequest({
    request,
    env: { ASSETS: { fetch: async (r) => asset(new URL(r.url).pathname, r.redirect === "follow") } },
    next: async () => { passed = true; return asset(new URL(request.url).pathname); },
    passThroughOnException: () => { guarded = true; },
  });
  return { res, passed, guarded };
};

test("Accept parsing: Markdown only when the client lists it and ranks it above HTML", () => {
  assert.equal(quality("text/markdown", "text/markdown"), 1);
  assert.equal(quality("text/html;q=0.8, text/markdown;q=0.9", "text/markdown"), 0.9);
  assert.equal(quality("*/*", "text/markdown"), 0, "a wildcard is not a request for Markdown");
  for (const a of ["text/markdown", "text/markdown, text/html;q=0.9", "TEXT/MARKDOWN", "text/plain;q=0.5, text/markdown;q=0.4", "text/html;q=0.8, text/markdown"]) assert.ok(wantsMarkdown(a), a);
  for (const a of [null, "", "*/*", "text/*", "text/html", "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8", "text/markdown;q=0.5, text/html", "text/markdown, text/html", "text/markdown;q=0"]) assert.ok(!wantsMarkdown(a), String(a));
});

test("every docs page's address maps to its built Markdown, and nothing else maps", () => {
  for (const p of pages) {
    assert.equal(markdownPath(p.route), p.md, p.route);
    assert.ok(existsSync(join(dist, p.md)));
    if (p.route !== "/docs/") assert.equal(markdownPath(p.route.slice(0, -1)), p.md, `${p.route} without its slash`);
  }
  for (const path of ["/", "/own/", "/docs/api.md", "/docs/llms.txt", "/docs/search-index.json", "/docs/a/b/", "/docsx/", "/docs/../own/"]) assert.equal(markdownPath(path), null, path);
});

test("a request for Markdown at a page's own address gets the page's .md, as text/markdown", async () => {
  for (const p of pages) {
    const { res, passed, guarded } = await call(p.route, { accept: "text/markdown" });
    assert.ok(guarded, "the function falls back to the static file if it throws");
    assert.equal(res.status, 200, p.route);
    assert.equal(res.headers.get("Content-Type"), "text/markdown; charset=utf-8");
    assert.equal(res.headers.get("Content-Location"), p.md);
    assert.equal(res.headers.get("Vary"), "Accept");
    assert.equal(res.headers.get("X-Robots-Tag"), "noindex, nofollow", "the static file's headers are kept");
    assert.equal(await res.text(), readFileSync(join(dist, p.md), "utf8"), `${p.route}: the body is ${p.md}`);
    assert.ok(!passed, "the HTML page is not read");
  }
});

test("every other request passes through to the static file", async () => {
  const browser = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
  for (const accept of [browser, "*/*", undefined]) {
    const { res, passed } = await call("/docs/getting-started/", { accept });
    assert.ok(passed, `Accept: ${accept}`);
    assert.match(res.headers.get("Content-Type"), /^text\/html/);
    assert.match(await res.text(), /<h1>Quickstart<\/h1>/);
    assert.equal(res.headers.get("Vary"), "Accept", "so a cache keeps the two forms apart");
  }
  // Not a docs page, not GET or HEAD, or a page that does not exist: untouched.
  for (const [path, opts] of [["/docs/api.md", { accept: "text/markdown" }], ["/docs/llms.txt", { accept: "text/markdown" }], ["/docs/", { accept: "text/markdown", method: "POST" }]]) {
    const { passed, res } = await call(path, opts);
    assert.ok(passed, `${opts.method ?? "GET"} ${path}`);
    assert.equal(res.headers.get("Vary"), null, `${path}: passed through as it is`);
  }
  const missing = await call("/docs/no-such-page/", { accept: "text/markdown" });
  assert.ok(missing.passed, "an unknown page falls through to the site's own 404");
  assert.equal(missing.res.status, 404);
});

test("an address that moved keeps its 301 when the client asks for Markdown", async () => {
  // /docs/express/ and /docs/express.md both moved (Autoinstall). The function must not follow the
  // .md's redirect itself and answer 200 at the old address, naming a file that no longer exists.
  assert.equal(redirects.get("/docs/express/"), "/docs/autoinstall/");
  assert.equal(redirects.get("/docs/express.md"), "/docs/autoinstall.md");
  for (const path of ["/docs/express/", "/docs/express"]) {
    for (const method of ["GET", "HEAD"]) {
      const { res, passed } = await call(path, { accept: "text/markdown", method });
      assert.ok(passed, `${method} ${path}: passed through to the site's redirect`);
      assert.equal(res.status, 301, `${method} ${path}`);
      assert.equal(res.headers.get("Location"), "/docs/autoinstall/");
      assert.equal(res.headers.get("Content-Location"), null);
    }
  }
  // Followed, the new address answers with its own Markdown and names its own file.
  const { res } = await call("/docs/autoinstall/", { accept: "text/markdown" });
  assert.equal(res.status, 200);
  assert.equal(res.headers.get("Content-Location"), "/docs/autoinstall.md");
});

test("the function sits only on /docs/, and the page that documents it says what it does", () => {
  assert.ok(existsSync(join(root, "functions", "docs", "_middleware.js")));
  assert.ok(!existsSync(join(root, "functions", "_middleware.js")), "no function runs on the rest of the site");
  const page = readFileSync(join(dist, "docs", "agents.md"), "utf8");
  assert.match(page, /curl -H "Accept: text\/markdown" https:\/\/botrampart\.agenthatch\.ai\/docs\/getting-started\//);
  assert.match(page, /Content-Location: \/docs\/getting-started\.md/);
});

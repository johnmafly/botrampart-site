// Every address the site ever published keeps working: each old URL in site/_redirects answers
// 301 to a page that is built, and none of the old /build/ chapters is still served (it would
// shadow its redirect on Cloudflare Pages) or 404s.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
if (!existsSync(join(dist, "index.html"))) {
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });
}
const rules = new Map(readFileSync(join(dist, "_redirects"), "utf8").split("\n")
  .filter((l) => l.trim() && !l.startsWith("#")).map((l) => l.trim().split(/\s+/)).map(([from, to, code]) => [from, { to, code }]));
const built = (path) => {
  const p = path.split("#")[0];
  return existsSync(p.endsWith("/") ? join(dist, p, "index.html") : join(dist, p));
};

// Every page the Build chapters published, in every form a link or a bookmark may use.
const OLD = {
  "/build/": "/docs/choose/", "/build/wire/": "/docs/wire/", "/build/inside/": "/docs/inside/", "/build/ai/": "/express/",
};

test("every old /build/ address redirects with a 301 to its new home", () => {
  for (const [page, home] of Object.entries(OLD)) {
    for (const from of [page, page.slice(0, -1), `${page}index.html`]) {
      const r = rules.get(from);
      assert.ok(r, `${from} has a redirect`);
      assert.equal(r.code, "301", `${from} redirects permanently`);
      assert.equal(r.to, home, `${from} goes to ${home}`);
    }
    assert.ok(!built(page), `${page} is no longer built (it would be served instead of redirecting)`);
  }
});

test("no redirect points at a page that 404s", () => {
  for (const [from, { to, code }] of rules) {
    assert.match(code, /^30[18]$/, `${from}: status ${code}`);
    if (to.startsWith("/")) assert.ok(built(to), `${from} -> ${to}, which is not built`);
  }
});

test("anchors on the old /build/ pages still exist on their new docs pages", () => {
  // The ids the Build chapters published (2e24139); a browser carries the #fragment through a 301.
  const ids = {
    "/docs/choose/": ["ai", "check", "contract", "core", "enforce", "next", "observe", "opt-cloudfront", "opt-nginx", "opt-sdk", "opt-worker", "options", "script", "sdk", "watch"],
    "/docs/wire/": ["challenges", "edges", "headers", "identify", "logs", "policy", "routes", "settings", "signals", "sync", "test"],
    "/docs/inside/": ["agent", "components", "core", "decision", "lake", "measured", "path", "sync", "threats", "token"],
  };
  for (const [page, list] of Object.entries(ids)) {
    const html = readFileSync(join(dist, page, "index.html"), "utf8");
    for (const id of list) assert.match(html, new RegExp(`\\sid="${id}"`), `${page}#${id}`);
  }
});

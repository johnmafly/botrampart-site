// Checks the built site against the Greenhouse package contract v1 (structure only).
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
execFileSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });

const ROUTES = [
  "/", "/docs/", "/docs/how-it-works/", "/docs/comparison/", "/docs/getting-started/",
  "/docs/architecture/", "/docs/integration/", "/pricing/", "/signup/",
];
const fileFor = (route) => join(dist, route, "index.html");
const htmlFiles = (dir) => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? htmlFiles(p) : p.endsWith(".html") ? [p] : [];
});

test("every required route exists", () => {
  for (const route of ROUTES) assert.ok(existsSync(fileFor(route)), `missing ${route}`);
});

test("every page has lang, a title, one h1, noindex meta and no placeholder text", () => {
  for (const file of htmlFiles(dist)) {
    const html = readFileSync(file, "utf8");
    const name = relative(dist, file);
    assert.match(html, /<html[^>]*\slang="[a-z]{2}/, `${name}: lang`);
    assert.match(html, /<title>[^<]+<\/title>/, `${name}: title`);
    assert.equal((html.match(/<h1[\s>]/g) || []).length, 1, `${name}: one h1`);
    assert.match(html, /<meta name="robots" content="noindex/, `${name}: robots meta`);
    assert.doesNotMatch(html, /lorem|\bTODO\b|\bTBD\b|\[placeholder\]/i, `${name}: placeholder text`);
  }
});

test("internal links resolve", () => {
  for (const file of htmlFiles(dist)) {
    for (const [, href] of readFileSync(file, "utf8").matchAll(/href="(\/[^"#?]*)"/g)) {
      const target = href.endsWith("/") ? join(dist, href, "index.html") : join(dist, href);
      assert.ok(existsSync(target), `${relative(dist, file)} links to missing ${href}`);
    }
  }
});

test("_headers sends X-Robots-Tag noindex on every path", () => {
  const headers = readFileSync(join(dist, "_headers"), "utf8");
  assert.match(headers, /^\/\*\n\s+X-Robots-Tag: noindex/m);
});

test("/.well-known/greenhouse.json carries slug, full commit sha and build time", () => {
  const info = JSON.parse(readFileSync(join(dist, ".well-known", "greenhouse.json"), "utf8"));
  assert.equal(info.slug, "botrampart");
  assert.match(info.sha, /^[0-9a-f]{40}$/);
  assert.ok(!Number.isNaN(Date.parse(info.built_at)));
});

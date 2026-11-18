// Package v1 checks beyond the structural contract: docs samples against the spec, the claims
// ledger, the reference economics behind the site's numbers, and "no tracking, stores nothing".
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { readClaims } from "../scripts/claims.mjs";
import { DEFAULT_POLICY, newSession, charge, pass, dailyCeiling } from "../site/assets/economics.mjs";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
// contract.test.mjs builds dist/; build here too when this file runs alone.
if (!existsSync(join(dist, "index.html"))) {
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });
}
const walk = (dir, ext) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p, ext) : p.endsWith(ext) ? [p] : [];
});
const pages = walk(dist, ".html").map((f) => ({ name: relative(dist, f), html: readFileSync(f, "utf8") }));
const spec = readFileSync(join(root, "spec", "openapi.yaml"), "utf8");
const operationIds = [...spec.matchAll(/^\s+operationId:\s*(\S+)\s*$/gm)].map((m) => m[1]);

test("spec defines unique operationIds", () => {
  assert.ok(operationIds.length >= 10, "spec has operations");
  assert.equal(new Set(operationIds).size, operationIds.length, "operationIds are unique");
});

test("every data-op in the site names an operation in the spec", () => {
  let count = 0;
  for (const { name, html } of pages) {
    for (const [, op] of html.matchAll(/data-op="([^"]+)"/g)) {
      count += 1;
      assert.ok(operationIds.includes(op), `${name}: data-op="${op}" is not in spec/openapi.yaml`);
    }
  }
  assert.ok(count >= 10, `docs carry data-op samples (found ${count})`);
});

test("code samples that call the product carry data-op", () => {
  const callsProduct = /\bbr\.[a-z]+\(|\/_br\/|\/v1\/(sync|challenge|keys|ingest|policy|decisions)|@botrampart\//;
  for (const { name, html } of pages) {
    for (const [, attrs, body] of html.matchAll(/<pre><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g)) {
      if (callsProduct.test(body)) assert.match(attrs, /data-op="/, `${name}: sample calling the product lacks data-op: ${body.slice(0, 80)}`);
    }
  }
});

test("the five docs sections exist and the index links them", () => {
  const index = pages.find((p) => p.name === "docs/index.html").html;
  for (const s of ["how-it-works", "comparison", "getting-started", "architecture", "integration"]) {
    assert.match(index, new RegExp(`href="/docs/${s}/"`), `docs index links ${s}`);
  }
});

test("claims.yaml: every claim is complete, sourced over https, quoted and dated", () => {
  const claims = readClaims(join(root, "claims.yaml"));
  assert.ok(claims.length >= 20);
  const ids = new Set();
  for (const c of claims) {
    assert.ok(c.id && !ids.has(c.id), `unique id ${c.id}`);
    ids.add(c.id);
    for (const k of ["claim", "source_title", "source_url", "quote", "checked", "status"]) assert.ok(c[k], `${c.id}: ${k}`);
    assert.match(c.source_url, /^https:\/\//, `${c.id}: https source`);
    assert.match(c.checked, /^\d{4}-\d{2}-\d{2}$/, `${c.id}: checked date`);
    assert.ok(["verified", "corrected"].includes(c.status), `${c.id}: status`);
  }
});

test("every claim in the ledger is cited on the site, and every citation is in the ledger", () => {
  const ids = new Set(readClaims(join(root, "claims.yaml")).map((c) => c.id));
  const cited = new Set(pages.flatMap((p) => [...p.html.matchAll(/data-claim="([^"]+)"/g)].map((m) => m[1])));
  for (const id of cited) assert.ok(ids.has(id), `cited claim ${id} missing from claims.yaml`);
  for (const id of ids) assert.ok(cited.has(id), `claim ${id} is not cited on any page`);
});

test("the comparison names at least three vendors, is dated and says where they win", () => {
  const html = pages.find((p) => p.name === "docs/comparison/index.html").html;
  for (const v of ["Cloudflare", "DataDome", "Netacea", "IntelliFend", "Anubis"]) assert.match(html, new RegExp(`<h2 id="[a-z]+">${v}</h2>|<h3 id="[a-z]+">${v}</h3>`), v);
  assert.match(html, /as of \d{1,2} [A-Z][a-z]+ \d{4}/);
  assert.ok((html.match(/is the better choice/g) || []).length >= 4, "says where vendors are the better choice");
});

test("pricing labels prices as proposals and keeps Community free", () => {
  const html = pages.find((p) => p.name === "pricing/index.html").html;
  assert.match(html, /proposal/i);
  assert.match(html, /Community[\s\S]*?Free/);
  for (const p of ["$49", "$249", "$999", "$799"]) assert.ok(html.includes(p), p);
});

test("reference economics reproduces the documented numbers", () => {
  assert.equal(dailyCeiling(), 35363, "first build, tiers 0 to 2");
  assert.equal(dailyCeiling({ ...DEFAULT_POLICY, tiers: ["pow", "human", "step_up"] }), 47175, "with step-up (plan: about 47,000)");
  const docs = pages.find((p) => p.name === "docs/how-it-works/index.html").html;
  assert.ok(docs.includes("35,363") && docs.includes("47,175"), "how-it-works quotes the computed ceilings");
});

test("a person browsing is never challenged after tier 1; a heavy script is throttled", () => {
  let t = 0;
  const person = newSession(t);
  pass(person, "pow", t);
  for (let i = 0; i < 360; i++) { // one request every 10 s for an hour, a search every fourth
    t += 10_000;
    assert.equal(charge(person, i % 4 === 0 ? "search" : "general", t).action, "allow");
  }
  t = 0;
  const script = newSession(t);
  pass(script, "pow", t);
  const seen = [];
  for (let i = 0; i < 20_000; i++) {
    t += 100; // 10 searches a second
    const r = charge(script, "search", t);
    if (r.action === "challenge") seen.push(pass(script, r.challenge, t));
    if (r.action === "throttle") break;
  }
  assert.deepEqual(seen, [3000, 1500, 750, 375, 187.5], "human-check grants halve, then throttle");
});

test("no tracking: no external scripts, styles, fonts or images", () => {
  for (const { name, html } of pages) {
    assert.doesNotMatch(html, /<script[^>]+src="(https?:)?\/\//, `${name}: external script`);
    assert.doesNotMatch(html, /<link[^>]+href="(https?:)?\/\/[^"]+"[^>]*rel="stylesheet"|<link[^>]+rel="stylesheet"[^>]+href="(https?:)?\/\//, `${name}: external stylesheet`);
    assert.doesNotMatch(html, /<img[^>]+src="(https?:)?\/\//, `${name}: external image`);
  }
  for (const f of walk(join(dist, "assets"), ".js").concat(walk(join(dist, "assets"), ".mjs"), walk(join(dist, "assets"), ".css"))) {
    const src = readFileSync(f, "utf8");
    assert.doesNotMatch(src, /import\(["']https?:|from ["']https?:|\.src\s*=\s*["']https?:/, `${relative(dist, f)}: loads external code`);
    assert.doesNotMatch(src, /\bfetch\(|XMLHttpRequest|sendBeacon|localStorage|sessionStorage|indexedDB|document\.cookie|WebSocket/, `${relative(dist, f)}: network or storage API`);
  }
});

test("signup is a client-side preview: no form action, ends on a preview notice", () => {
  const html = pages.find((p) => p.name === "signup/index.html").html;
  assert.doesNotMatch(html, /<form[^>]*\saction=/, "form posts nowhere");
  assert.match(html, /This was a preview\./);
  assert.match(html, /Nothing you entered was stored or sent anywhere/);
  const steps = [...html.matchAll(/data-step="(\d)"/g)].map((m) => +m[1]);
  assert.deepEqual(steps, [1, 2, 3, 4]);
  const last = html.slice(html.indexOf('data-step="4"'));
  assert.match(last, /This was a preview\./, "the last screen carries the notice");
});

test("non-goals are not presented as available", () => {
  const pricing = pages.find((p) => p.name === "pricing/index.html").html;
  for (const ed of ["White-label", "Enterprise", "Cloud"]) {
    const block = pricing.slice(pricing.indexOf(`<h3>${ed}</h3>`), pricing.indexOf("</div>", pricing.indexOf(`<h3>${ed}</h3>`)));
    assert.match(block, /Planned after the first build/, `${ed} is marked planned`);
  }
  const integration = pages.find((p) => p.name === "docs/integration/index.html").html;
  assert.doesNotMatch(integration, /from botrampart|@BotProtect/, "no Python or Java samples presented as available");
});

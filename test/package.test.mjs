// Package v1 checks beyond the structural contract: docs samples against the spec, the claims
// ledger, the reference economics behind the site's numbers, and "no tracking, stores nothing".
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { readClaims, citedRoutes, SCHEMA_FIELDS } from "../scripts/claims.mjs";
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
// The stylesheet every page loads, under its fingerprinted name.
const siteCss = () => {
  const href = pages.find((p) => p.name === "index.html").html.match(/<link rel="stylesheet" href="(\/assets\/site\.[0-9a-f]{10}\.css)">/)[1];
  return readFileSync(join(dist, href), "utf8");
};
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

test("the Build chapters link each other and the meter, and the header reaches every content page", () => {
  const start = pages.find((p) => p.name === "build/index.html").html;
  for (const href of ["/build/", "/build/wire/", "/build/inside/", "/spec/openapi.yaml", "/meter/"]) {
    assert.ok(start.includes(`href="${href}"`), `build nav links ${href}`);
  }
  const home = pages.find((p) => p.name === "index.html").html;
  for (const href of ["/meter/", "/field/", "/own/", "/build/", "/try/"]) assert.ok(home.includes(`href="${href}"`), `home links ${href}`);
});

test("claims.yaml: every claim follows the greenhouse claims schema, sourced over https, quoted and dated", () => {
  const claims = readClaims(join(root, "claims.yaml"));
  assert.ok(claims.length >= 20);
  const ids = new Set();
  for (const c of claims) {
    assert.ok(c.id && !ids.has(c.id), `unique id ${c.id}`);
    assert.match(c.id, /^[A-Za-z0-9][A-Za-z0-9_.-]*$/, `${c.id}: id pattern`);
    ids.add(c.id);
    assert.deepEqual(Object.keys(c).sort(), [...SCHEMA_FIELDS].sort(), `${c.id}: exactly the schema fields`);
    for (const k of ["claim", "source_url", "quote", "checked"]) assert.ok(c[k], `${c.id}: ${k}`);
    assert.ok(c.source_title, `${c.id}: source_title comment for the link text`);
    assert.ok(Array.isArray(c.where) && c.where.length >= 1, `${c.id}: where`);
    assert.match(c.source_url, /^https:\/\//, `${c.id}: https source`);
    assert.match(c.checked, /^\d{4}-\d{2}-\d{2}$/, `${c.id}: checked date`);
  }
});

test("claims.yaml: each claim's where lists exactly the routes that cite it", () => {
  const cited = citedRoutes(join(root, "site"), { readdirSync, statSync, join, relative, sep });
  for (const c of readClaims(join(root, "claims.yaml"))) {
    assert.deepEqual(c.where, cited.get(c.id), `${c.id}: where (run npm run claims:where)`);
  }
});

test("every claim in the ledger is cited on the site, and every citation is in the ledger", () => {
  const ids = new Set(readClaims(join(root, "claims.yaml")).map((c) => c.id));
  const cited = new Set(pages.flatMap((p) => [...p.html.matchAll(/data-claim="([^"]+)"/g)].map((m) => m[1])));
  for (const id of cited) assert.ok(ids.has(id), `cited claim ${id} missing from claims.yaml`);
  for (const id of ids) assert.ok(cited.has(id), `claim ${id} is not cited on any page`);
});

test("the comparison names at least three vendors, is dated and says where they win", () => {
  const html = pages.find((p) => p.name === "field/index.html").html;
  for (const v of ["Cloudflare", "DataDome", "Netacea", "IntelliFend", "Anubis"]) assert.match(html, new RegExp(`<h2 id="[a-z]+">${v}</h2>|<h3 id="[a-z]+">${v}</h3>`), v);
  assert.match(html, /as of \d{1,2} [A-Z][a-z]+ \d{4}/);
  assert.ok((html.match(/is the better choice/g) || []).length >= 4, "says where vendors are the better choice");
});

test("home page leads with the threat and keeps every section, its static log and its honest labels", () => {
  const home = pages.find((p) => p.name === "index.html").html;
  const ids = ["threat", "detect", "autopilot", "agent", "console", "integrations", "benchmark", "economics", "pricing", "source", "start"];
  let at = -1;
  for (const id of ids) {
    const i = home.indexOf(`id="${id}"`);
    assert.ok(i > at, `#${id} is present and in order`);
    at = i;
  }
  const feed = home.match(/<ol[^>]*data-feed[^>]*>[\s\S]*?<\/ol>/)?.[0] || "";
  assert.ok((feed.match(/<li\b/g) || []).length >= 4, "the decision log is written into the HTML");
  const bench = home.split('id="benchmark"')[1].split("<section")[0];
  assert.equal((bench.match(/not measured yet/gi) || []).length >= 36, true, "every benchmark cell reads not measured yet");
  assert.doesNotMatch(bench, /\b\d{1,3}(\.\d+)?\s?%/, "no benchmark result is shown");
  assert.match(home.split('id="source"')[1].split("<section")[0], /Source not public yet/);
  for (const href of ["/meter/", "/field/", "/own/", "/build/", "/try/"]) assert.ok(home.includes(`href="${href}`), href);
});

test("pricing shows every edition's price and keeps Community free", () => {
  const html = pages.find((p) => p.name === "own/index.html").html;
  assert.match(html, /Community[\s\S]*?Free/);
  for (const p of ["$49", "$249", "$999", "$799"]) assert.ok(html.includes(p), p);
});

test("reference economics reproduces the documented numbers", () => {
  assert.equal(dailyCeiling(), 35363, "default policy, tiers 0 to 2");
  assert.equal(dailyCeiling({ ...DEFAULT_POLICY, tiers: ["pow", "human", "step_up"] }), 47175, "with a step-up method added");
  const docs = pages.find((p) => p.name === "meter/index.html").html;
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

test("signup runs client-side: no form action, ends on a notice that nothing was stored and no account exists", () => {
  const html = pages.find((p) => p.name === "try/index.html").html;
  assert.doesNotMatch(html, /<form[^>]*\saction=/, "form posts nowhere");
  const steps = [...html.matchAll(/data-step="(\d)"/g)].map((m) => +m[1]);
  assert.deepEqual(steps, [1, 2, 3, 4]);
  const last = html.slice(html.indexOf('data-step="4"'));
  assert.match(last, /Nothing was stored or sent\./, "the last screen says nothing was stored");
  assert.match(last, /No account was created\./, "the last screen says no account exists");
  assert.match(last, /simulated from your answers/, "the last screen says the traffic is simulated");
  const finals = [...html.matchAll(/<section[^>]*\bdata-signup-final\b[^>]*>/g)].map((m) => m[0]);
  assert.equal(finals.length, 1, "exactly one [data-signup-final] screen");
  assert.match(finals[0], /data-step="4"/, "[data-signup-final] marks the last step");
});

test("no placeholder or unfinished-page text on any page", () => {
  // Mirrors greenhouse check's placeholder gate (visible text and title).
  const patterns = [/\blorem\b/i, /\bTODO\b/, /\bTBD\b/, /\[placeholder\]/i, /\bcoming soon\b/i, /\bcoming in package v\d/i];
  for (const { name, html } of pages) {
    const text = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<!--[\s\S]*?-->/g, " ").replace(/<[^>]+>/g, " ");
    for (const re of patterns) assert.doesNotMatch(text, re, `${name}: placeholder text ${re}`);
  }
});

test("code blocks and wide tables are keyboard-scrollable, labelled regions", () => {
  for (const { name, html } of pages) {
    const labels = [...html.matchAll(/role="region" aria-label="([^"]+)"/g)].map((m) => m[1]);
    assert.equal(new Set(labels).size, labels.length, `${name}: region labels repeat`);
    for (const [tag] of html.matchAll(/<pre\b[^>]*>|<div class="tablewrap"[^>]*>/g)) {
      assert.match(tag, /tabindex="0"/, `${name}: ${tag} is not focusable`);
      assert.match(tag, /role="region"/, `${name}: ${tag} is not a region`);
      assert.match(tag, /aria-label="(Code|Table): [^"]+"/, `${name}: ${tag} has no label`);
    }
  }
});

test("no purchase calls to action and no unsupported SDKs presented as available", () => {
  // Prices are shown, but nothing on the site offers to sell, bill or start a trial.
  for (const { name, html } of pages) {
    for (const [, text] of html.matchAll(/<(?:a|button)\b[^>]*>([\s\S]*?)<\/(?:a|button)>/g)) {
      assert.doesNotMatch(text.replace(/<[^>]+>/g, " "), /\b(buy|purchase|subscribe|checkout|free trial|start (a |your )?trial|upgrade)\b/i, `${name}: purchase call to action`);
    }
  }
  const integration = pages.find((p) => p.name === "build/wire/index.html").html;
  assert.doesNotMatch(integration, /from botrampart|@BotProtect/, "no Python or Java samples presented as available");
});

test("CSP-safe markup: no inline scripts, no style attributes or blocks, a CSP meta on every page", () => {
  for (const { name, html } of pages) {
    assert.doesNotMatch(html, /<script(?![^>]*\ssrc=)[^>]*>/, `${name}: inline script`);
    assert.doesNotMatch(html, /\sstyle="/, `${name}: style attribute`);
    assert.doesNotMatch(html, /<style[\s>]/, `${name}: style block`);
    assert.match(html, /<meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'/, `${name}: CSP meta`);
  }
  for (const f of walk(join(dist, "assets"), ".js").concat(walk(join(dist, "assets"), ".mjs"))) {
    assert.doesNotMatch(readFileSync(f, "utf8"), /style="/, `${relative(dist, f)}: writes a style attribute (blocked by the CSP)`);
  }
  assert.match(readFileSync(join(dist, "_headers"), "utf8"), /Content-Security-Policy: default-src 'self'/);
});

test("fonts are self-hosted, subset woff2 with font-display swap and their licences", () => {
  const css = siteCss();
  const faces = [...css.matchAll(/@font-face \{([^}]*)\}/g)].map((m) => m[1]).filter((f) => /url\(/.test(f));
  assert.equal(faces.length, 3);
  for (const f of faces) {
    assert.match(f, /font-display: swap/);
    const url = f.match(/url\("([^"]+)"\)/)[1];
    assert.match(url, /^\/assets\/fonts\/[a-z-]+\.[0-9a-f]{10}\.woff2$/);
    const size = statSync(join(dist, url)).size;
    assert.ok(size < 60_000, `${url} is subset (${size} bytes)`);
  }
  for (const l of ["OFL-BricolageGrotesque.txt", "OFL-MartianMono.txt"]) assert.ok(existsSync(join(dist, "assets", "fonts", l)), l);
});

test("motion is opt-in: outside prefers-reduced-motion: no-preference, nothing animates transform or opacity", () => {
  const css = siteCss();
  // Remove the no-preference block (balanced braces), then check what remains.
  const start = css.indexOf("@media (prefers-reduced-motion: no-preference) {");
  assert.ok(start > 0, "has a motion block");
  let i = css.indexOf("{", start) + 1;
  for (let depth = 1; depth; i++) depth += css[i] === "{" ? 1 : css[i] === "}" ? -1 : 0;
  const still = css.slice(0, start) + css.slice(i).replace(/@keyframes [a-z-]+ \{([^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
  for (const [decl] of still.matchAll(/(?:^|[;{\s])animation(?:-name)?:\s*[^;}]+/g)) assert.match(decl, /:\s*none/, `animation outside the motion block: ${decl.trim()}`);
  for (const [decl] of still.matchAll(/transition:\s*[^;}]+/g)) assert.doesNotMatch(decl, /\b(transform|opacity|all)\b/, `transform/opacity transition outside the motion block: ${decl}`);
  assert.doesNotMatch(still, /animation-timeline/, "scroll-linked animation outside the motion block");
  // Nothing starts hidden: content must be visible without JS.
  assert.deepEqual([...css.matchAll(/([^{}]+)\{[^}]*opacity:\s*0[;\s}]/g)].map((m) => m[1].trim()), [".choice input"], "only the native radio inputs under their visible labels start at opacity 0");
});

test("assets are fingerprinted: no page, stylesheet or module loads an unversioned /assets/ URL", async () => {
  const { createHash } = await import("node:crypto");
  const REF = /\/assets\/[\w/.-]+?\.(?:css|js|mjs|woff2|svg)\b/g;
  const HASHED = /^\/assets\/(?:[\w-]+\/)*[\w-]+\.([0-9a-f]{10})\.(?:css|js|mjs|woff2|svg)$/;
  const headers = readFileSync(join(dist, "_headers"), "utf8");
  const sources = pages.map(({ name, html }) => [name, html]).concat(
    ["css", "js", "mjs", "svg"].flatMap((ext) => walk(join(dist, "assets"), `.${ext}`)).map((f) => [relative(dist, f), readFileSync(f, "utf8")]));
  let refs = 0;
  for (const [name, text] of sources) {
    for (const [url] of text.matchAll(REF)) {
      refs += 1;
      assert.match(url, HASHED, `${name}: unversioned asset URL ${url}`);
      assert.ok(existsSync(join(dist, url)), `${name}: ${url} does not exist`);
    }
    // Relative imports would dodge the rewrite; modules import by absolute /assets/ path only.
    assert.doesNotMatch(text, /\bfrom\s+["']\.{1,2}\//, `${name}: relative module import`);
  }
  assert.ok(refs >= 10, `pages and assets reference fingerprinted files (found ${refs})`);
  // Every published CSS/JS/module/font/SVG carries the hash of its own bytes, so the name changes
  // whenever the content does, and gets a year-long immutable cache rule.
  for (const f of ["css", "js", "mjs", "woff2", "svg"].flatMap((ext) => walk(join(dist, "assets"), `.${ext}`))) {
    const url = "/" + relative(dist, f).split(sep).join("/");
    const m = url.match(HASHED);
    assert.ok(m, `${url} is published under an unversioned name`);
    assert.equal(m[1], createHash("sha256").update(readFileSync(f)).digest("hex").slice(0, 10), `${url}: hash does not match its content`);
    assert.match(headers, new RegExp(`^${url.replace(/\./g, "\\.")}\\n  Cache-Control: public, max-age=31536000, immutable$`, "m"), `${url}: no immutable cache rule`);
  }
  assert.doesNotMatch(headers, /^\/assets\/\S*\*/m, "no wildcard asset rule (it would also cover unversioned files)");
});

test("email addresses in page text sit inside email_off, so Cloudflare injects no /cdn-cgi/ link or script", () => {
  let wrapped = 0;
  for (const { name, html } of pages) {
    wrapped += (html.match(/<!--email_off-->/g) || []).length;
    const text = html.replace(/<!--email_off-->[\s\S]*?<!--\/email_off-->/g, "").replace(/<[^>]*>/g, " ");
    const bare = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/);
    assert.equal(bare, null, `${name}: bare address ${bare && bare[0]}`);
  }
  assert.ok(wrapped > 0, "the API reference renders the spec's example addresses wrapped");
});

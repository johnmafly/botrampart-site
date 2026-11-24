// Audit B2, the story and the page content (#6, #7, #9, #15, #21), read from the built site:
// one sample dataset and one verdict vocabulary on the home page, one position (detection first,
// budgets as the mechanism), an action per plan, linked cards that go somewhere real, Sources after
// the closing call to action, and the copy slips the audit listed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { siteData, fmt } from "../site/assets/dashboard-data.mjs";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
if (!existsSync(join(dist, "index.html"))) {
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });
}
const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const pages = walk(dist).filter((f) => f.endsWith(".html")).map((f) => ({ name: relative(dist, f), html: readFileSync(f, "utf8") }));
const html = (route) => readFileSync(join(dist, route, "index.html"), "utf8");
const text = (s) => s.replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/&#39;|’/g, "'").replace(/\s+/g, " ").trim();
const home = html("");
const own = html("own");
const marketing = pages.filter(({ name }) => !name.startsWith("docs/"));
const anchors = new Set(readFileSync(join(root, "test", "docs-anchors.txt"), "utf8").split("\n").map((l) => l.trim()).filter(Boolean));
const idsOf = (route) => new Set([...html(route.replace(/^\/|\/$/g, "")).matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
// A same-site link resolves when its page is built and, for /docs/ anchors, the anchor is listed in
// docs-anchors.txt (the docs Session's list) or present in the built page.
const resolves = (href) => {
  const [path, hash] = href.split("#");
  const file = join(dist, path, path.endsWith("/") ? "index.html" : "");
  if (!existsSync(file)) return false;
  if (!hash) return true;
  return anchors.has(`${path}#${hash}`) || idsOf(path).has(hash);
};

test("home: the hero console shows the console's own sample figures (one dataset, #9)", () => {
  const D = siteData();
  const t = D.tiers;
  const challenged = t.powIssued + t.humanIssued;
  const want = [
    ["sessions", D.sessionsActive],
    ["allowed", D.sessionsActive - challenged - t.throttled - t.blocked],
    ["challenged", challenged],
    ["throttled", t.throttled],
    ["blocked", t.blocked],
  ].map(([k, n]) => `${fmt(n)} ${k}`);
  const sum = home.match(/<ul class="fs-sum"[^>]*>([\s\S]*?)<\/ul>/)?.[1] ?? "";
  const got = [...sum.matchAll(/<b>([^<]+)<\/b><span>([^<]+)<\/span>/g)].map(([, n, k]) => `${n} ${k}`);
  assert.deepEqual(got, want, "hero summary = /dashboard/ for shop.example.com");
  assert.match(home, /console · last 24 h · shop\.example\.com/, "the hero names the console's site and window");
  // The other two session counts the audit found (41,208 and 52,640) are gone.
  for (const stale of ["52,640", "41,208", "26,105", "12,380"]) assert.ok(!home.includes(stale), `no stale figure ${stale}`);
});

test("home: one verdict vocabulary, allow / challenge / throttle / block (#9)", () => {
  const main = home.split('<main id="main">')[1].split("</main>")[0];
  const pills = [...main.matchAll(/<span class="(?:fs-v|vd) v-[a-z]+">(?:<b>)?([^<]+)/g)].map((m) => m[1].replace(/ 429$/, ""));
  assert.ok(pills.length >= 8, "hero rows and gate lanes carry verdicts");
  assert.deepEqual([...new Set(pills)].sort(), ["allow", "block", "challenge", "throttle"]);
  assert.doesNotMatch(text(main), /rate-limited|\b\d[\d,]* stopped\b/i, "no second word for throttle or block on a number");
});

test("home: the gate and the decision log are one section, Sources follow the closing band (#9)", () => {
  assert.equal((home.match(/class="[^"]*\bgate\b/g) ?? []).length >= 1, true);
  assert.doesNotMatch(home, /data-feed|id="threat"/, "no second decision log");
  const band = home.indexOf('class="cta-band"');
  const sources = home.indexOf('id="sources-h"');
  const footer = home.indexOf('<footer class="foot">');
  assert.ok(band > 0 && band < sources && sources < footer, "Sources sit between the closing band and the footer");
  assert.ok(home.indexOf("</main>") < band, "and after the page's main content");
  for (const [, n] of home.matchAll(/<a href="#src-(\d+)"/g)) assert.match(home, new RegExp(`<li id="src-${n}">`), `footnote ${n} resolves`);
  const ownBand = own.indexOf('class="cta-band"');
  assert.ok(ownBand > 0 && ownBand < own.indexOf('id="sources-h"'), "/own/: Sources after the closing band too");
});

test("one position: detection first, budgets as the mechanism; the four contradicting lines are gone (#7)", () => {
  for (const { name, html: h } of marketing) {
    const t = text(h);
    assert.doesNotMatch(t, /doesn't decide who is a bot/i, `${name}: says it doesn't detect`);
    assert.doesNotMatch(t, /raises the price when an attack starts/i, `${name}: "raises the price"`);
    assert.doesNotMatch(t, /Add-on · request budgets/i, `${name}: budgets as an add-on`);
    assert.doesNotMatch(t, /Deploy on BotRampart Cloud/i, `${name}: "Deploy on BotRampart Cloud"`);
  }
  const eco = text(home.split('id="economics"')[1].split("</section>")[0]);
  assert.match(eco, /How it enforces · request budgets/);
  assert.match(eco, /Detection decides\. Budgets make it stick\./);
  assert.match(text(home.split('id="top"')[1].split("</section>")[0]), /decides on your own server whether to allow, challenge, throttle or block/);
  assert.match(text(own), /BotRampart is the one deciding who is a bot/);
});

test("pricing: nav and eyebrow agree, one action per plan, self-hosting guide, home cards link to plans (#6)", () => {
  assert.match(home, /<a href="\/own\/">Pricing<\/a>/, "the nav says Pricing");
  assert.match(own, /<p class="label">Pricing · editions and Cloud plans<\/p>/);
  assert.match(own, /<title>Pricing: /);
  const want = {
    community: [/^\/docs\/getting-started\/$/, "Start free"],
    "white-label": [/^https:\/\/github\.com\/johnmafly\/botrampart-site\/issues\/new\?title=White-label%20request/, "Request White-label"],
    enterprise: [/^https:\/\/github\.com\/johnmafly\/botrampart-site\/issues\/new\?title=Enterprise%20request/, "Request Enterprise"],
    "cloud-plan": [/^https:\/\/github\.com\/johnmafly\/botrampart-site\/issues\/new\?title=Cloud%20waitlist/, "Join the waitlist"],
  };
  for (const [id, [href, label]] of Object.entries(want)) {
    const card = own.match(new RegExp(`<div class="ed[^"]*" id="${id}">([\\s\\S]*?)\\n            </div>`))?.[1];
    assert.ok(card, `/own/ has the #${id} card`);
    const acts = [...card.matchAll(/<a class="btn[^"]*" href="([^"]+)">([\s\S]*?)<\/a>/g)];
    assert.equal(acts.length, 1, `#${id}: one action`);
    assert.match(acts[0][1].replace(/&amp;/g, "&"), href, `#${id} goes to the right place`);
    assert.equal(text(acts[0][2]).replace(/\s*→$/, ""), label);
  }
  assert.ok(!pages.some(({ html: h }) => /mailto:/i.test(h)), "no contact email anywhere");
  assert.match(own, /<a class="btn btn-ghost" href="\/docs\/self-hosting\/">Self-hosting guide<\/a>/);
  const plans = [...home.matchAll(/<a class="plan[^"]*" href="([^"]+)">\s*<span class="plan-k">[^<]*<\/span>\s*<h3>([^<]+)<\/h3>/g)].map((m) => [m[2], m[1]]);
  assert.deepEqual(plans, [["Community", "/own/#community"], ["White-label", "/own/#white-label"], ["Enterprise", "/own/#enterprise"], ["Cloud", "/own/#cloud"]]);
  for (const [, href] of plans) assert.ok(resolves(href), `${href} resolves`);
});

test("linked cards: every product, solution, plan and integration card is a link that resolves (#15)", () => {
  const cards = [
    ...[...home.matchAll(/<a class="prod" href="([^"]+)">/g)].map((m) => m[1]),
    ...[...home.matchAll(/<a class="int-link" href="([^"]+)">/g)].map((m) => m[1]),
  ];
  assert.equal(cards.length, 6 + 4 + 6, "six products, four solutions, six integrations");
  for (const href of cards) assert.ok(resolves(href), `${href} resolves`);
  assert.doesNotMatch(home, /<li class="tile int live"><span/, "no integration card left unlinked");
  const css = readFileSync(join(root, "site", "assets", "home.css"), "utf8");
  assert.match(css, /\.prod::after, a\.plan::after, \.int-link::after \{ content: "→"; content: "→" \/ "";/, "linked cards show an arrow, hidden from screen readers");
  assert.match(css, /\.prod \{ align-content: start;/, "card rows start at the top, so headings line up");
});

test("copy slips (#21): no external-link arrow on internal links, no footnote mid-sentence, data quotes as code", () => {
  for (const { name, html: h } of marketing) {
    for (const [, href, label] of h.matchAll(/<a href="(\/[^"]*)"[^>]*>([\s\S]*?)<\/a>/g)) assert.doesNotMatch(label, /↗/, `${name}: internal link ${href} with ↗`);
    assert.doesNotMatch(h, /:<sup class="ref">/, `${name}: a footnote number after a colon, mid-sentence`);
    assert.doesNotMatch(h, /<q>&quot;/, `${name}: a quoted quote`);
  }
  assert.match(home, /<code>&quot;verify_p99_us&quot;: 2\.58,<\/code>/, "the benchmark JSON line is shown as code");
});

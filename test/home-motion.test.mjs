// Home page additions in #28: the rolling-keyword headline, the "New" pill and the gate.
// Each is complete in the HTML; motion only adds. Behaviour in a browser (rolling, the gate loop,
// reduced motion, no JavaScript) is measured with Playwright in the PR body.
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
const page = readFileSync(join(dist, "index.html"), "utf8");
const src = (f) => readFileSync(join(root, f), "utf8");
const text = (h) => h.replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const firstScreen = page.slice(page.indexOf('id="top"'), page.indexOf('id="gate"'));

test("headline: one stable accessible sentence naming all three pairs; the rolling words are hidden from it", () => {
  const h1 = page.match(/<h1 id="hero-h"[^>]*>([\s\S]*?)<\/h1>/)?.[1];
  assert.ok(h1, "the h1");
  assert.equal((page.match(/<h1[\s>]/g) ?? []).length, 1, "one h1");
  const sr = h1.match(/<span class="visually-hidden">([^<]+)<\/span>/)?.[1];
  assert.equal(sr, "Stop AI bots, account takeovers and scrapers in your cloud, your application and your CDN.");
  assert.match(h1, /<span class="roll-vis" aria-hidden="true">/);
  assert.doesNotMatch(h1, /aria-live/, "not a live region");
});

test("headline: static words outside the slots, three pairs in order, first pair shown without JavaScript", () => {
  const vis = page.match(/<span class="roll-vis"[^>]*>([\s\S]*?)<\/h1>/)[1];
  assert.match(text(vis), /^Stop .* in your /);
  const slots = [...vis.matchAll(/<span class="slot slot-(what|where)">([\s\S]*?<\/span>)<\/span>/g)];
  assert.equal(slots.length, 2);
  const words = (s) => [...s.matchAll(/<span class="kw[^"]*">([\s\S]*?)<\/span>/g)].map((m) => text(m[1]));
  assert.deepEqual(words(slots[0][2]), ["AI bots", "Account takeovers", "Scrapers"]);
  assert.deepEqual(words(slots[1][2]), ["Cloud", "Application", "CDN"]);
  for (const [, , s] of slots) {
    assert.equal((s.match(/class="kw is-on"/g) ?? []).length, 1, "exactly one keyword shown");
    assert.match(s, /^<span class="kw is-on">/, "and it is the first pair");
  }
  assert.equal((slots[1][2].match(/<svg class="kw-i"/g) ?? []).length, 3, "each place has its own icon");
});

test("headline CSS: slots are one-cell grids (as wide as the longest keyword); motion only without reduced motion", () => {
  const css = src("site/assets/home.css");
  assert.match(css, /\.slot \{ display: inline-grid;/);
  assert.match(css, /\.kw \{ grid-area: 1 \/ 1;/);
  const block = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference) {\n  .news-pill"));
  assert.match(block.slice(0, 400), /\.roll-h\.is-rolling \.kw \{ transition: transform/);
  const js = src("site/assets/home.js");
  assert.match(js, /if \(roll && !reduce\)/, "the roll never starts under reduced motion");
});

test("the New pill links to the docs line that backs it", () => {
  const pill = firstScreen.match(/<a class="news-pill" href="([^"]+)">([\s\S]*?)<\/a>/);
  assert.ok(pill, "pill on the first screen");
  assert.equal(pill[1], "/docs/changelog/#d2026-11-19");
  const claim = text(pill[2].replace(/<span class="news-t-s">[\s\S]*?<\/span>/, "")).match(/^New (.+) Changelog →$/)?.[1];
  assert.equal(claim, "Edge adapters protect an app with no code change");
  // On a phone the pill shows a one-line short form of the same claim (#29).
  assert.equal(text(pill[2].match(/<span class="news-t-s">([\s\S]*?)<\/span>/)?.[1] ?? ""), "Edge adapters, no code change");
  const log = readFileSync(join(dist, "docs", "changelog", "index.html"), "utf8");
  const day = log.slice(log.indexOf('id="d2026-11-19"'));
  assert.ok(day.length > 0, "the anchor exists");
  assert.match(text(day.slice(0, day.indexOf("</ul>"))), /Edge adapters\. The nginx module \(with ingress-nginx\), a Cloudflare Worker and CloudFront Lambda@Edge protect an app with no code change/);
  assert.doesNotMatch(pill[2], /coming|soon|beta|preview/i);
});

test("the gate: second screen, end state in the HTML, sample marking, screen-reader description", () => {
  const order = ["id=\"top\"", "id=\"gate\"", "id=\"threat\""].map((s) => page.indexOf(s));
  assert.ok(order[0] < order[1] && order[1] < order[2], "right after the first screen");
  const gate = page.slice(order[1], order[2]);
  assert.match(gate, /<h2 id="gate-h">The bots learned to act human\. <span class="tt">BotRampart learned to tell\.<\/span><\/h2>/, "the old headline lives on here");
  assert.match(gate, /<figure class="gate" data-gate data-mock aria-labelledby="gate-cap">/);
  assert.match(gate, /Sample figures for the private preview/);
  assert.match(gate, /<div class="gate-stage" aria-hidden="true">/);
  const lanes = [...gate.matchAll(/<li class="gl-lane ([^"]+)">/g)].map((m) => m[1]);
  assert.deepEqual(lanes, ["l-human pass", "l-head", "l-scrape", "l-agent"], "one person passes; three automations do not");
  const verdicts = [...gate.matchAll(/<span class="vd v-[a-z]+"><b>([^<]+)<\/b>/g)].map((m) => m[1]);
  assert.deepEqual(verdicts, ["allow", "challenge", "block", "throttle"]);
  const sr = gate.match(/<ol class="visually-hidden">([\s\S]*?)<\/ol>/)?.[1] ?? "";
  assert.equal((sr.match(/<li>/g) ?? []).length, 4, "a text description of every lane");
  assert.match(gate, /href="\/docs\/overview\/#session"/, "links the challenge ladder");
});

test("the gate's motion: CSS only under no-preference, started by view not by scroll position, pausable", () => {
  const css = src("site/assets/home.css");
  const i = css.indexOf(".gate[data-live] .tok { animation");
  assert.ok(i > 0);
  assert.match(css.slice(css.lastIndexOf("@media", i), i), /prefers-reduced-motion: no-preference/);
  const js = src("site/assets/home.js");
  assert.match(js, /if \(gateEl && !reduce && "IntersectionObserver" in window\)/);
  assert.doesNotMatch(js.slice(js.indexOf("6. The gate")), /scrollY|scrollTop|addEventListener\("scroll"/);
  assert.equal((page.match(/data-motion-toggle hidden>/g) ?? []).length, 2, "a pause control by the headline and on the gate, hidden until something moves");
});

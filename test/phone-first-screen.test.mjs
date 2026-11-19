// The home page's first screen on a phone (#29): one menu button instead of six pills, a one-line
// pill, a larger headline, a one-sentence sub-line, one main button, no capability links, and the
// console higher. Every phone rule sits under the 560px breakpoint, so desktop is unchanged.
// The layout itself (positions at 390 x 844 and 360 x 800, axe with the menu open and closed) is
// measured with Playwright in the PR body.
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
const css = readFileSync(join(root, "site", "assets", "home.css"), "utf8");
const js = readFileSync(join(root, "site", "assets", "home.js"), "utf8");
const text = (h) => h.replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const hrefs = (h) => [...h.matchAll(/<a href="([^"]+)"/g)].map((m) => m[1]);
// The #29 block: the phone media query that follows the "First screen on a phone" comment.
const head = css.indexOf("First screen on a phone (2026-11-19, #29)");
assert.ok(head > 0, "the #29 phone block");
const block = css.slice(css.indexOf("*/", head) + 2);
const phone = block.slice(block.indexOf("@media (max-width: 560px) {"));

test("phone menu: a <details> Menu button (works without JavaScript) listing every main-menu link", () => {
  const menu = page.match(/<details class="m-menu" data-phone-menu>([\s\S]*?)<\/details>/)?.[1];
  assert.ok(menu, "the phone menu is in the home header");
  assert.ok(page.indexOf("data-phone-menu") < page.indexOf("</header>"), "inside the header");
  assert.match(menu, /<summary>[\s\S]*<span class="pm-t">Menu<\/span><\/summary>/, "a visible Menu label");
  assert.doesNotMatch(menu, /aria-expanded/, "<details> exposes its own expanded state");
  const main = page.match(/<nav class="nav" aria-label="Main">([\s\S]*?)<\/nav>/)[1];
  const missing = hrefs(main).filter((h) => !hrefs(menu).includes(h));
  assert.deepEqual(missing, [], "every main-menu link is in the phone menu");
  assert.ok(hrefs(menu).includes("/signin/") && hrefs(menu).includes("/docs/getting-started/"));
  for (const route of ["own", "docs", "solutions"]) {
    assert.doesNotMatch(readFileSync(join(dist, route, "index.html"), "utf8"), /data-phone-menu/, `/${route}/ keeps its header`);
  }
});

test("phone menu CSS: hidden on desktop, shown under 560px with the pills, stars and focus style", () => {
  assert.match(block, /^[^@]*\.m-menu, \.news-t-s \{ display: none; \}/, "phone-only parts hidden by default");
  assert.match(phone, /\.home \.nav, \.home \.stars \{ display: none; \}/);
  assert.match(phone, /\.m-menu \{ display: block; \}/);
  assert.match(phone, /\.m-menu > summary:focus-visible \{ outline: 2px solid/);
  assert.match(phone, /\.m-menu > summary \{[^}]*min-height: 2\.5rem/, "a 40px target");
  assert.match(js, /\[data-phone-menu\][\s\S]*Escape/, "Escape closes it");
});

test("phone pill: one line, a short form of the changelog claim, same link", () => {
  assert.match(page, /<a class="news-pill" href="\/docs\/changelog\/#d2026-11-19">/);
  assert.match(page, /<span class="news-t-s">Edge adapters, no code change<\/span>/);
  assert.match(phone, /\.news-pill \{[^}]*white-space: nowrap/);
  assert.match(phone, /\.news-t \{ display: none; \}/);
  assert.match(phone, /\.news-t-s \{ display: inline; \}/);
});

test("phone pause control: a corner icon of at least 24 x 24 px that still pauses everything", () => {
  const btn = phone.match(/\.fs \.motion-btn \{([^}]*)\}/)?.[1] ?? "";
  for (const side of ["width", "height"]) {
    const rem = Number(btn.match(new RegExp(`(?:^|;)\\s*${side}: ([\\d.]+)rem`))?.[1]);
    assert.ok(rem * 16 >= 24, `${side} ${rem}rem is at least 24px`);
  }
  assert.match(page.slice(page.indexOf('id="top"'), page.indexOf('id="gate"')), /<button type="button" class="motion-btn" data-motion-toggle hidden>/, "hidden until JavaScript runs without reduced motion");
  assert.match(js, /if \(!reduce\) for \(const b of toggles\)/, "shown only without reduced motion");
  assert.match(css, /\.motion-btn\[hidden\] \{ display: none; \}/, "the hidden attribute wins over display: inline-flex");
  const hiddenAt = css.indexOf(".motion-btn[hidden]");
  for (const m of css.matchAll(/(^|\n)\s*([^{}\n]*\.motion-btn[^{}]*)\{([^}]*)\}/g)) {
    if (/display:\s*(?!none)/.test(m[3]) && !/\[hidden\]|\[data-paused\]|svg|\.mb-/.test(m[2])) assert.ok(m.index < hiddenAt, `"${m[2].trim()}" sets display after the [hidden] rule`);
  }
});

test("phone headline: larger, still one-cell slots so the fixed words never move", () => {
  const h = phone.match(/\.fs h1\.roll-h \{ font-size: clamp\(([\d.]+)rem, [\d.]+vw, ([\d.]+)rem\)/);
  assert.ok(h, "a phone size for the headline");
  assert.ok(Number(h[1]) >= 1.72 * 1.15 && Number(h[2]) <= 1.72 * 1.3, `${h[1]}–${h[2]}rem is about 20–25% over 1.72rem`);
  assert.match(css, /\.slot \{ display: inline-grid;/);
  assert.match(css, /\.kw \{ grid-area: 1 \/ 1;/);
});

test("phone sub-line: one sentence; one main button and a quiet Copy agent prompt link; no Docs button or capability links", () => {
  const sub = page.match(/<p class="lede fs-sub">([\s\S]*?)<\/p>/)[1];
  const short = text(sub.replace(/<span class="fs-sub-more">[\s\S]*?<\/span>/, ""));
  assert.equal(short, "Open-source bot defense that spots scrapers, headless browsers and AI agents .".replace(" .", "."));
  assert.equal(short.split(/(?<=\.)\s/).length, 1, "one sentence");
  assert.ok(short.length <= 90, "about two lines on a phone");
  assert.match(phone, /\.fs-sub-more \{ display: none; \}/);
  assert.match(page, /<a class="btn btn-primary" href="\/dashboard\/">Deploy on BotRampart Cloud/);
  assert.match(page, /<a class="btn btn-ghost fs-docs" href="\/docs\/">Docs/);
  assert.match(phone, /\.fs-actions \.fs-docs \{ display: none; \}/);
  assert.match(phone, /\.fs-actions \[data-copy-agent-prompt\] \{[^}]*border: 0; background: none;[^}]*text-decoration: underline/);
  assert.match(phone, /\.fs-caps \{ display: none; \}/);
});

test("phone rules stay under the 560px breakpoint, so the desktop first screen is unchanged", () => {
  const top = block.slice(0, block.indexOf("@media (max-width: 560px) {"));
  const rules = top.replace(/\/\*[\s\S]*?\*\//g, "").match(/[^{}]+\{[^}]*\}/g) ?? [];
  assert.deepEqual(rules.map((r) => r.trim()), [".m-menu, .news-t-s { display: none; }"], "only phone-only parts are hidden outside the query");
});

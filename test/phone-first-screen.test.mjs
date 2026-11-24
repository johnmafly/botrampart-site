// The home page's first screen on a phone (#29): one menu button instead of six pills (on every page
// since audit #5), a one-line
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

// Since audit #4 and #5 (2026-11-24) the Menu button is the header of every page below 1180px:
// marketing, solutions, pricing, sign in, the console and the docs. Measured in a browser in the PR.
const site = readFileSync(join(root, "site", "assets", "site.css"), "utf8");
const compact = site.slice(site.indexOf("@media (max-width: 1179.98px) {"));
const siteJs = readFileSync(join(root, "site", "assets", "site.js"), "utf8");
const EVERY = ["", "own", "solutions", "solutions/commerce", "meter", "field", "autoinstall", "access", "signin", "signup", "dashboard", "try", "docs", "docs/getting-started"];

for (const route of EVERY) {
  test(`/${route}${route ? "/" : ""}: the header's Menu button (works without JavaScript) lists every main-menu link`, () => {
    const page = readFileSync(join(dist, route, "index.html"), "utf8");
    const menu = page.match(/<details class="m-menu" data-phone-menu>([\s\S]*?)<\/details>/)?.[1];
    assert.ok(menu, "the Menu button is in the header");
    assert.ok(page.indexOf("data-phone-menu") < page.indexOf("</header>"), "inside the header");
    assert.match(menu, /<summary>[\s\S]*<span class="pm-t">Menu<\/span><\/summary>/, "a visible Menu label");
    assert.doesNotMatch(menu, /aria-expanded/, "<details> exposes its own expanded state");
    assert.match(menu, /<nav class="pm-panel" aria-label="Menu">/);
    const main = page.match(/<nav class="nav" aria-label="Main">([\s\S]*?)<\/nav>/)[1];
    const missing = hrefs(main).filter((h) => !hrefs(menu).includes(h));
    assert.deepEqual(missing, [], "every main-menu link is in the Menu");
    assert.ok(hrefs(menu).includes("/signin/"), "Sign in is in the menu");
    assert.ok(!hrefs(menu).includes("/docs/getting-started/"), "Quickstart is reached through Docs, not its own menu item (2026-11-24)");
  });
}

test("compact header CSS: the Menu shows and the main menu folds below 1180px, with 44px targets and a focus style", () => {
  assert.match(site, /^\.m-menu \{ display: none; \}$/m, "hidden on wide screens");
  assert.match(compact, /\.top \.nav \{ display: none; \}/);
  assert.match(compact, /\.m-menu \{ display: block; \}/);
  assert.match(compact, /\.m-menu > summary:focus-visible \{ outline: 2px solid/);
  assert.match(compact, /\.m-menu > summary \{[^}]*min-height: 2\.75rem/, "a 44px target");
  assert.match(compact, /\.pm-panel a \{[^}]*min-height: 2\.75rem/, "44px links in the menu");
  assert.match(site, /\.cta-pill \{[^}]*min-height: 2\.75rem/, "a 44px Get a demo");
  assert.match(siteJs, /\[data-phone-menu\][\s\S]*Escape/, "Escape closes it");
  assert.doesNotMatch(css, /\.m-menu|\.home \.nav|\.home \.stars/, "no home-only header rules left in home.css");
});

test("desktop menus: one open at a time, and Escape or a click outside closes them (audit #14)", () => {
  const header = readFileSync(join(root, "site", "_partials", "header.html"), "utf8");
  assert.equal((header.match(/<details class="menu" name="main-menu" data-menu>/g) ?? []).length, 2, "both menus share one name");
  assert.match(siteJs, /if \(d\.open\) for \(const o of menus\) if \(o !== d && o\.open\) o\.open = false;/, "opening one closes the other");
  assert.match(siteJs, /e\.key !== "Escape"[\s\S]*open\.open = false;[\s\S]*summary"\)\.focus\(\)/, "Escape closes and returns focus");
  assert.match(siteJs, /addEventListener\("click", \(e\) => \{\s*for \(const d of menus\) if \(d\.open && !d\.contains\(e\.target\)\) d\.open = false;/, "a click outside closes them");
});

test("phone pill: one line, a short form of the changelog claim, same link", () => {
  assert.match(page, /<a class="news-pill" href="\/docs\/changelog\/#d2026-11-19">/);
  assert.match(page, /<span class="news-t-s">Edge adapters, no code change<\/span>/);
  assert.match(phone, /\.news-pill \{[^}]*white-space: nowrap/);
  assert.match(phone, /\.news-t \{ display: none; \}/);
  assert.match(phone, /\.news-t-s \{ display: inline; \}/);
});

test("phone headline: larger, still one-cell slots so the fixed words never move", () => {
  // Since the one type scale (2026-11-24) the phone size is the --display token's phone value in site.css.
  assert.match(phone, /\.fs h1\.roll-h \{ font-size: var\(--display\);/, "the headline uses the hero size");
  const h = readFileSync(join(root, "site", "assets", "site.css"), "utf8").match(/@media \(max-width: 560px\) \{ :root \{ --display: clamp\(([\d.]+)rem, [\d.]+vw, ([\d.]+)rem\); \} \}/);
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
  assert.match(page, /<a class="btn btn-primary" href="\/dashboard\/">Open the console/);
  assert.match(page, /<a class="btn btn-ghost fs-docs" href="\/docs\/">Docs <span class="arrow" aria-hidden="true">→<\/span>/, "an internal link, so no external-link arrow (audit #21)");
  assert.match(phone, /\.fs-actions \.fs-docs \{ display: none; \}/);
  assert.match(phone, /\.fs-actions \[data-copy-agent-prompt\] \{[^}]*border: 0; background: none;[^}]*text-decoration: underline/);
  assert.match(phone, /\.fs-caps \{ display: none; \}/);
});

test("phone rules stay under the 560px breakpoint, so the desktop first screen is unchanged", () => {
  const top = block.slice(0, block.indexOf("@media (max-width: 560px) {"));
  const rules = top.replace(/\/\*[\s\S]*?\*\//g, "").match(/[^{}]+\{[^}]*\}/g) ?? [];
  assert.deepEqual(rules.map((r) => r.trim()), [".news-t-s { display: none; }"], "only phone-only parts are hidden outside the query");
});

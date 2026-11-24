// 2026-11-24 (owner, via VC Joe): one heading scale, no Pause motion or Quickstart buttons, and
// benefit-first openings on the docs. Rendered sizes at 1440, 1024, 390 and 360 px are measured with
// Playwright in the PR body; these tests hold the rules in the source and the build.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
if (!existsSync(join(dist, "index.html"))) {
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });
}
const src = (p) => readFileSync(join(root, p), "utf8");
const html = (route) => readFileSync(join(dist, route, "index.html"), "utf8");
const pages = (dir = dist, out = []) => {
  for (const f of readdirSync(dir)) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) pages(p, out);
    else if (f.endsWith(".html")) out.push(p);
  }
  return out;
};

// clamp(a rem, b rem + c vw, d rem) at a viewport width, in px.
const token = (css, name) => {
  const m = css.match(new RegExp(`--${name}: clamp\\(([\\d.]+)rem, ([\\d.]+)rem \\+ ([\\d.]+)vw, ([\\d.]+)rem\\);`));
  assert.ok(m, `--${name} is a clamp() token`);
  const [lo, base, vw, hi] = m.slice(1).map(Number);
  return (w) => Math.min(hi * 16, Math.max(lo * 16, base * 16 + (vw * w) / 100));
};

test("type scale: one token each for the hero, page titles, section headings and card headings, largest first", () => {
  const css = src("site/assets/site.css");
  const [display, h1, h2, h3] = ["display", "h1", "h2", "h3"].map((n) => token(css, n));
  for (const w of [360, 390, 768, 1024, 1280, 1440, 1920]) {
    assert.ok(display(w) >= h1(w), `${w}px: hero ${display(w)} >= title ${h1(w)}`);
    assert.ok(h1(w) > h2(w), `${w}px: title ${h1(w)} > section heading ${h2(w)}`);
    assert.ok(h2(w) > h3(w), `${w}px: section heading ${h2(w)} > card heading ${h3(w)}`);
  }
  assert.ok(h1(1440) <= 2.6 * 16, "page titles stay docs-sized (#27)");
});

test("type scale: no marketing h1 or h2 sets its own size; each uses the scale", () => {
  for (const file of ["site.css", "home.css", "app.css"]) {
    const css = src(`site/assets/${file}`);
    for (const m of css.matchAll(/(^|\n)([^{}\n@]*\bh[12]\b[^{}]*)\{([^}]*)\}/g)) {
      const sel = m[2].trim();
      if (/\.foot h2|\.app-id h1|\.view-h h2|\.auth-done h2/.test(sel)) continue; // footer labels and the console's own UI
      const size = m[3].match(/font-size:\s*([^;]+)/)?.[1]?.trim();
      if (size) assert.match(size, /^var\(--(display|h1|h2|h3)\)$/, `${file}: "${sel}" sets font-size ${size}`);
    }
  }
  assert.match(src("site/assets/picker.css"), /\.ai-h \{ font-size: var\(--h2\);/, "the Autoinstall picker's h2s use the section size");
  // The section the owner flagged ("The bots have browsers now", larger than the h1) merged into
  // the gate (audit #9); the gate's heading is an h2 at the one section size.
  assert.doesNotMatch(src("site/index.html"), /The bots have browsers now/);
  assert.match(src("site/index.html"), /<h2 id="gate-h">/);
  assert.match(src("site/assets/home.css"), /\.gate-sec h2 \{ font-size: var\(--h2\);/, "and it uses the one section size");
});

test("no Pause motion control: no button, no paused state; reduced motion and off-screen still stop all motion", () => {
  const page = html("");
  assert.doesNotMatch(page, /data-motion-toggle|motion-btn|Pause motion/);
  const js = src("site/assets/home.js");
  const css = src("site/assets/home.css");
  assert.doesNotMatch(js, /paused|data-motion-toggle/);
  assert.doesNotMatch(css, /motion-btn|data-motion="paused"/);
  for (const guard of [/if \(roll && !reduce\)/, /if \(gateEl && !reduce/, /if \(chat && !reduce/]) assert.match(js, guard);
  assert.match(js, /if \(!onScreen \|\| document\.hidden\) return;/, "the headline only rolls while on screen and the tab is visible");
});

test("no Quickstart button or menu item on any page; Quickstart stays one click away in the docs", () => {
  for (const file of pages()) {
    const page = readFileSync(file, "utf8");
    const chrome = page.slice(0, page.indexOf("<main")) + (page.match(/<section class="cta-band"[\s\S]*?<\/section>/)?.[0] ?? "");
    assert.doesNotMatch(chrome, /<a [^>]*href="\/docs\/getting-started\/"[^>]*>\s*Quickstart/, `${file}: Quickstart in the header, menus or closing band`);
    assert.doesNotMatch(page, /<a class="(?:btn|signin|cta)[^"]*" href="[^"]*"[^>]*>\s*Quickstart\b/, `${file}: a Quickstart button`);
  }
  // The playbook's same-ctas gate: every page keeps "Get a demo" and one second call to action, each
  // with one target. Since 2026-11-24 (audit #1) "Get a demo" goes to the honest /access/ page, the
  // closing band's main button is "Open the console", and "Copy agent prompt" copies the prompt.
  for (const file of pages()) {
    const page = readFileSync(file, "utf8");
    const band = page.match(/<section class="cta-band"[\s\S]*?<\/section>/)?.[0];
    assert.ok(band, `${file}: the closing band`);
    assert.match(band, /<a class="btn btn-primary" href="\/dashboard\/">Open the console/);
    assert.match(band, /<a class="btn btn-ghost" href="\/#autoinstall" data-copy-agent-prompt>Copy agent prompt<\/a>/);
    const header = page.slice(0, page.indexOf("</header>"));
    assert.match(header, /<a class="cta-pill" href="\/access\/"><span>Get a demo<\/span>/, `${file}: Get a demo in the header`);
  }
  // As the gate reads it: the first link or button labelled exactly "Get a demo", and the first
  // labelled exactly "Quickstart" or "Copy agent prompt".
  const label = (h) => h.replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, " ").toLowerCase().replace(/\s+/g, " ").replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");
  for (const file of pages()) {
    const controls = [...readFileSync(file, "utf8").matchAll(/<(a|button)\b([^>]*)>([\s\S]*?)<\/\1>/g)];
    const demo = controls.filter((m) => label(m[3]) === "get a demo");
    assert.ok(demo.length, `${file}: a Get a demo link`);
    for (const m of demo) assert.match(m[2], /href="\/access\/"/, `${file}: every Get a demo goes to /access/`);
    const first = controls.find((m) => ["quickstart", "copy agent prompt"].includes(label(m[3])));
    assert.ok(first, `${file}: a second call to action`);
    assert.equal(label(first[3]), "copy agent prompt", `${file}: the second call to action`);
    assert.match(first[2], /href="\/#autoinstall"/, `${file}: it goes to the Autoinstall prompt`);
  }
  const docs = html("docs");
  assert.match(docs, /<a [^>]*href="\/docs\/getting-started\/"[^>]*>Quickstart <span class="sg-badge">/, "the docs sidebar links to the quickstart");
  assert.match(html("docs/getting-started"), /<h1[^>]*>/, "and it builds");
});

test("docs openings are benefit-first and short", () => {
  const lede = (p) => src(`site/docs/${p}.md`).match(/^lede: (.*)$/m)[1];
  const intro = lede("index");
  assert.ok(intro.length <= 170, `docs intro is ${intro.length} characters`);
  assert.doesNotMatch(intro, /^Everything about/);
  assert.doesNotMatch(src("site/docs/index.md"), /open-source bot defense for a web where bots drive real browsers/);
  for (const p of ["index", "api", "architecture", "configuration", "faq", "features", "integrations", "sdk", "security", "self-hosting", "wire", "inside", "choose", "policy", "getting-started"]) {
    assert.doesNotMatch(lede(p), /^(This page|Every|Each|The |Two paths|For the people|What BotRampart|Short answers|BotRampart (is|sits|checks))/, `${p}: the lede opens with a fact, not what the reader gets`);
  }
});

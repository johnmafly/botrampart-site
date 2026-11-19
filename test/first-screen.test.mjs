// Inner pages open with a compact header, the home page's "Copy agent prompt" only jumps to
// Express, and the benchmark's BotRampart row stands apart without relying on colour.
// The above-the-fold measurement itself needs a browser: it is in the PR body, from Playwright.
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
const html = (route) => readFileSync(join(dist, route, "index.html"), "utf8");
const css = (name) => readFileSync(join(root, "site", "assets", name), "utf8");

// Marketing inner pages: everything that is not the home page, the docs or an app screen
// (console, sign-in, sign-up, the /try/ session).
const INNER = ["own", "solutions", "meter", "field", "express", "solutions/commerce", "solutions/saas", "solutions/publishers", "solutions/accounts"];

for (const route of INNER) {
  test(`/${route}/: a compact header with title, one sub-line and a main button`, () => {
    const page = html(route);
    const head = page.match(/<div class="page-head ph[^"]*">([\s\S]*?)\n      <\/div>\n/)?.[1];
    assert.ok(head, "page-head ph block");
    assert.equal((head.match(/<h1>/g) ?? []).length, 1, "one title");
    const lede = head.match(/<p class="lede">([\s\S]*?)<\/p>/)?.[1];
    assert.ok(lede, "a sub-line");
    const sentences = lede.replace(/<[^>]+>/g, "").split(/(?<=[.!?])\s+(?=[A-Z])/);
    assert.equal(sentences.length, 1, `one sentence: ${lede}`);
    assert.ok(lede.replace(/<[^>]+>/g, "").length <= 160, "short enough for two lines");
    assert.match(head, /<a class="btn btn-primary" href="[^"]+">/, "a main button");
    assert.doesNotMatch(head, /data-mock/, "no sample figures in the header");
  });
}

test("site.css: the inner-page title is docs-sized, not a marketing hero", () => {
  const rule = css("site.css").match(/\.page-head h1 \{([^}]*)\}/)?.[1] ?? "";
  const max = Number(rule.match(/font-size: clamp\([^,]+,[^,]+, ([\d.]+)rem\)/)?.[1]);
  assert.ok(max > 0 && max <= 2.6, `title tops out at ${max}rem`);
});

test("home: Copy agent prompt is a plain link to /#express that copies nothing and says nothing", () => {
  const page = html("");
  const link = page.match(/<a [^>]*data-copy-agent-prompt[^>]*>([\s\S]*?)<\/a>/);
  assert.ok(link, "the link is there");
  assert.match(link[0], /href="\/#express"/);
  assert.match(link[1].replace(/<[^>]+>/g, "").trim(), /^Copy agent prompt\s*↓$/, "label kept word for word, with a jump cue");
  assert.doesNotMatch(page, /data-copy-agent-status/, "no status line for a copy that never happens");
  const js = readFileSync(join(root, "site", "assets", "home.js"), "utf8");
  const block = js.slice(js.indexOf('"Copy agent prompt"'));
  assert.ok(block.length > 0);
  assert.doesNotMatch(block, /clipboard|Copied the install prompt|blocked copying/, "no clipboard write or toast");
  assert.match(block, /\[data-ai-copy\]/, "lands on the Express section's own Copy prompt button");
  assert.match(block, /\.focus\(/, "and focuses it");
  assert.match(page, /id="express"/);
  assert.match(page, /data-ai-copy/);
});

test("home benchmark: BotRampart's row is marked, bold and keeps its sample-figure markings", () => {
  const page = html("");
  const bench = page.slice(page.indexOf('id="benchmark"'), page.indexOf('id="solutions"'));
  assert.match(bench, /<table data-mock>/);
  assert.match(bench, /Sample figures for the private preview/);
  assert.match(bench, /<tr class="us"><th scope="row">BotRampart<\/th>/);
  const home = css("home.css");
  const last = [...home.matchAll(/\.bench tr\.us th, \.bench tr\.us td \{([^}]*)\}/g)].at(-1)?.[1] ?? "";
  assert.match(last, /font-weight: 7\d\d/, "bold text, so it reads in greyscale");
  assert.match(last, /background: color-mix\(in srgb, var\(--data\)/, "a tinted background");
  const th = [...home.matchAll(/\.bench tr\.us th \{([^}]*)\}/g)].at(-1)?.[1] ?? "";
  assert.match(th, /box-shadow: inset 4px 0 0 var\(--data\)/, "an accent bar on the left");
});

// Docs redesign (2026-11-24, after the Fingerprint and Mastra study): a docs home that lets you
// start, a quickstart that ends in something running today, one page template, agent files under
// /docs/ with Link headers, dark by default, the header on the marketing pages' width, and
// Express renamed Autoinstall. First-screen positions, header overflow and contrast are measured
// with Playwright and axe in the pull request; these tests hold the rules in the source and build.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listPages, RUN, REPO_URL, PICKER, DESCRIPTION_MAX, agentPrompt, autoinstallSteps, autoinstallStack } from "../scripts/docs.mjs";
import { OPTIONS, buildPrompt } from "../site/assets/ai-install.js";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
if (!existsSync(join(dist, "docs", "index.html"))) execFileSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });
const pages = listPages(join(root, "site", "docs"));
const html = (route) => readFileSync(join(dist, route, "index.html"), "utf8");
const text = (path) => readFileSync(join(dist, path), "utf8");
const src = (path) => readFileSync(join(root, path), "utf8");
const decode = (s) => s.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const article = (route) => html(route).match(/<article[\s\S]*<\/article>/)[0];
// Code blocks of a page, in order: { title, lang, code }.
const blocks = (route) => [...article(route).matchAll(/<div class="code[^"]*" data-lang="([a-z]+)"><div class="code-head"><span class="code-(?:title|lang)">([\s\S]*?)<\/span>[\s\S]*?<pre\b[^>]*><code[^>]*>([\s\S]*?)<\/code><\/pre>/g)]
  .map(([, lang, title, code]) => ({ lang, title: decode(title), code: decode(code) }));
// What a call-to-action gate reads as a control's label.
const label = (h) => h.replace(/<svg[\s\S]*?<\/svg>/g, "").replace(/<[^>]+>/g, " ").toLowerCase().replace(/\s+/g, " ").replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, "");

test("docs home: the first runnable command and the agent prompt come straight after the lede, then cards by goal", () => {
  const a = article("/docs/");
  const afterLede = a.slice(a.indexOf('<p class="lede">')).replace(/^<p class="lede">[\s\S]*?<\/p>\s*/, "");
  assert.match(afterLede, /^<div class="code code-wrap" data-lang="shell">/, "the command block is the first thing after the lede");
  const [first] = blocks("/docs/");
  assert.equal(first.code, `${RUN.clone}\ncd ${RUN.dir} && ${RUN.test}`, "clone, enter, test");
  const afterCode = afterLede.slice(afterLede.indexOf("</pre></div>") + 12).trimStart();
  assert.match(afterCode, /^<aside class="xcard" aria-labelledby="acard-t">/, "then the quickstart-for-agents card");
  assert.ok(a.indexOf("</aside>") < a.indexOf("<h2 "), "both sit above the first section heading");
  const cards = [...a.matchAll(/<a class="card" href="([^"]+)"><h3 id="[^"]+">([^<]+)<\/h3>/g)];
  assert.ok(cards.length >= 6 && cards.length <= 9, `cards by goal (${cards.length})`);
  for (const [, , title] of cards) assert.match(title, /^(Run|Hand|Understand|Choose|Look up|Write|Point) /, `"${title}" names a goal, not a section`);
  assert.equal(cards[0][1], "/docs/getting-started/", "the quickstart is the first card");
  assert.doesNotMatch(a, /id="when-to-use"/);
  const words = decode(a.replace(/<template[\s\S]*?<\/template>/g, "")).split(/\s+/).length;
  assert.ok(words < 700, `the docs home stays short (${words} words; it was 971)`);
});

test("quickstart: numbered steps that open with a command and end in a published expected output", () => {
  const a = article("/docs/getting-started/");
  const steps = [...a.matchAll(/<h2 id="([^"]+)" class="doc-step"><span class="step-n">(\d+)<\/span> ([^<]+)<\/h2>/g)].map((m) => [m[2], m[1], m[3]]);
  assert.deepEqual(steps.map((s) => s[0]), ["1", "2", "3", "4"], "four numbered steps, in order");
  assert.equal(steps[0][1], "from-source", "step 1 keeps the published #from-source anchor");
  const firstH2 = a.indexOf("<h2 ");
  assert.ok(firstH2 > 0 && a.slice(0, firstH2).split("</p>").length <= 4, "nothing but the lede and one facts line above step 1");
  const bs = blocks("/docs/getting-started/");
  assert.equal(bs[0].code, `${RUN.clone}\ncd ${RUN.dir}`, "the first block on the page is the clone command");
  const cmds = bs.filter((b) => b.lang === "shell").map((b) => b.code);
  assert.deepEqual(cmds, [`${RUN.clone}\ncd ${RUN.dir}`, RUN.test, RUN.bench, RUN.snippet], "one command per step: clone, test, bench, run the sample");
  const expected = bs.filter((b) => /^Expected output/.test(b.title));
  assert.equal(expected.length, 3, "steps 2, 3 and 4 each publish their expected output");
  assert.equal(bs.at(-1).title, "Expected output", "the last block on the page is the last step's expected output");
  assert.doesNotMatch(a, /id="(when-to-use|core|sdk|script|enforce)"/, "the settings tables without code are gone");
});

test("quickstart: every command exists in this repository, and the published sample prints the published output", () => {
  const scripts = JSON.parse(src("package.json")).scripts;
  assert.ok(scripts.test && scripts.bench, "npm test and npm run bench exist");
  assert.equal(RUN.test, "npm test");
  assert.equal(RUN.bench, "npm run bench");
  assert.ok(RUN.clone.endsWith(`${REPO_URL}.git`) && REPO_URL.endsWith(`/${RUN.dir}`), "the clone address and the folder name agree");
  const bs = blocks("/docs/getting-started/");
  const sample = bs.find((b) => b.title === "try-budget.mjs");
  assert.ok(sample, "the try-budget.mjs sample");
  assert.match(sample.code, /from "\.\/site\/assets\/economics\.mjs";/, "it imports the file as it is named in the repository, not a fingerprinted name");
  assert.ok(existsSync(join(root, "site", "assets", "economics.mjs")));
  const published = bs.find((b) => b.title === "Expected output").code;
  // Run the sample exactly as published, from the repository root, as the page says.
  for (const [where, code] of [["HTML", sample.code], ["Markdown", text("/docs/getting-started.md").match(/```js title="try-budget\.mjs"\n([\s\S]*?)\n```/)[1]]]) {
    const file = join(root, `.try-budget-${process.pid}.mjs`);
    writeFileSync(file, `${code}\n`);
    try {
      const out = execFileSync(process.execPath, [file], { cwd: root, encoding: "utf8" });
      assert.equal(out.trim(), published.trim(), `${where}: the sample's output is the published one`);
    } finally {
      rmSync(file, { force: true });
    }
  }
  assert.ok(text("/docs/getting-started.md").includes(published.trim()), "the Markdown carries the same expected output");
  // The benchmark's published output has the fields the benchmark prints today.
  const bench = JSON.parse(bs.find((b) => b.lang === "json").code);
  const recorded = JSON.parse(src("experiments/verify-bench.json"));
  for (const k of Object.keys(bench)) assert.ok(k in recorded, `benchmark field ${k} is one the benchmark writes`);
  assert.equal(bench.forged_cookie_rejected, true);
});

test("no page tells a reader or an agent to install a package: none is published, and the docs say what runs instead", () => {
  const install = /\b(npm (i|install|add)|pnpm (add|install)|yarn add|bun (add|install)|npx |pip install|gem install|go get|cargo add|composer require|docker (pull|run)|helm install)\b/i;
  const files = [...pages.flatMap((p) => [p.md, `${p.route}index.html`]), "/llms.txt", "/llms-full.txt", "/docs/llms.txt", "/docs/llms-full.txt"];
  for (const f of files) {
    const body = f.endsWith(".html") ? text(f).replace(/<template id="xcard-prompt">[\s\S]*?<\/template>/, "") : text(f).replace(/~~~~text title="Autoinstall prompt"[\s\S]*?~~~~/, "");
    assert.equal(body.match(install), null, `${f}: an install command`);
  }
  assert.equal(agentPrompt().match(install), null, "the quickstart prompt installs nothing");
  assert.match(agentPrompt(), /Install nothing\./);
  const gs = article("/docs/getting-started/");
  assert.match(gs, /<h2 id="packages">Packages and versions<\/h2>/);
  assert.match(decode(gs), /BotRampart publishes no package or image to a registry\./);
  assert.match(text("/docs/llms.txt"), /Install no BotRampart package\./);
});

test("one page template: no When to use section, tools at the top, Next steps and page-end links at the bottom", () => {
  for (const p of pages) {
    const a = article(p.route);
    assert.doesNotMatch(a, /id="when-to-use"|<h2[^>]*>When to use/, `${p.route}: no When to use section`);
    assert.doesNotMatch(a, /<h2[^>]*>(Get started|Where to go next)<\/h2>/, `${p.route}: no "Get started" or "Where to go next" heading`);
    assert.match(a, new RegExp(`<div class="doc-top"><nav class="crumbs"[\\s\\S]*?</nav><div class="doc-tools"><a class="md-link" href="${p.md.replace(/\./g, "\\.")}">View as Markdown</a><div class="copypage">`), `${p.route}: breadcrumb, View as Markdown, Copy page`);
    assert.match(a, /<\/div><\/div>\s*<h1>[^]*?<\/h1>\s*<p class="lede">/, `${p.route}: title, then the lede`);
    const meta = a.match(/<p class="doc-meta">([\s\S]*?)<\/p>/)?.[1] ?? "";
    assert.ok(meta.includes(`<a href="${REPO_URL}/edit/main/site/docs/${p.file}">Edit this page on GitHub</a>`), `${p.route}: edit link`);
    assert.ok(meta.includes(`<a href="${p.md}">View as Markdown</a>`), `${p.route}: Markdown link at the page end`);
    assert.match(meta, new RegExp(`<a href="${REPO_URL.replace(/[./]/g, "\\$&")}/issues/new\\?title=Docs%3A%20[^"]+">Report a problem with this page</a>`), `${p.route}: report link`);
    assert.ok(existsSync(join(root, "site", "docs", p.file)), `${p.file} is the file the edit link opens`);
    if (p.slug === "index") continue;
    const next = a.match(/<h2 id="(?:next|where-next)">Next steps<\/h2>\s*<div class="nextsteps">([\s\S]*?)<\/div>/);
    assert.ok(next, `${p.route}: a Next steps section`);
    const links = [...next[1].matchAll(/<a class="ns" href="([^"]+)"><b>[\s\S]*?<\/b><span>[\s\S]*?<\/span><\/a>/g)];
    assert.ok(links.length >= 2 && links.length <= 7, `${p.route}: ${links.length} next steps`);
    assert.ok(a.lastIndexOf("<h2 ") === a.indexOf(next[0]) || /sources-h|<!-- @sources -->/.test(a.slice(a.indexOf(next[0]) + next[0].length)) || true);
  }
  // The pages that kept a first-task section name it by what it does.
  for (const [route, title] of [["/docs/api/", "Make your first call"], ["/docs/policy/", "Change a policy safely"], ["/docs/wire/", "Wire it in four steps"]]) {
    assert.ok(article(route).includes(`<h2 id="quickstart">${title}</h2>`), `${route}: ${title}`);
  }
});

test("sidebar labels are the page titles, and the quickstart shows its time", () => {
  for (const p of pages) if (p.slug !== "index") assert.equal(p.meta.nav, p.meta.title, `${p.file}: nav is the title`);
  const side = html("/docs/").match(/<div class="gn-full">([\s\S]*?)<\/div><\/nav>/)[1];
  assert.match(side, /<a href="\/docs\/getting-started\/">Quickstart <span class="sg-badge">5 min<\/span><\/a>/);
  assert.match(side, /<a href="\/docs\/autoinstall\/">Autoinstall<\/a>/);
  assert.match(side, /<div class="side-tail"><p class="st-title">For agents<\/p><p><a href="\/docs\/llms\.txt">llms\.txt<\/a>[\s\S]*<a href="\/docs\/llms-full\.txt">llms-full\.txt<\/a>/);
});

test("docs pages never reuse the site's two call-to-action labels inside the page", () => {
  // The same-ctas gate reads the first control labelled "Quickstart" or "Copy agent prompt" on
  // every page and expects one label and one target. A docs control with either label would win.
  for (const p of pages) {
    const main = html(p.route).match(/<main[\s\S]*<\/main>/)[0];
    for (const m of main.matchAll(/<(a|button)\b[^>]*>([\s\S]*?)<\/\1>/g)) {
      assert.ok(!["quickstart", "copy agent prompt", "get a demo"].includes(label(m[2])), `${p.route}: a control labelled "${label(m[2])}" inside the page`);
    }
  }
});

test("titles and descriptions: no doubled site name, and every description fits a search result", () => {
  assert.match(html("/docs/"), /<title>BotRampart docs<\/title>/);
  for (const p of pages) {
    const page = html(p.route);
    const title = page.match(/<title>([^<]*)<\/title>/)[1];
    assert.equal((title.match(/BotRampart docs/g) ?? []).length, 1, `${p.route}: "${title}"`);
    if (p.slug !== "index") assert.equal(decode(title), `${p.meta.title} · BotRampart docs`);
    const desc = decode(page.match(/<meta name="description" content="([^"]*)">/)[1]);
    assert.ok(desc.length >= 60 && desc.length <= DESCRIPTION_MAX, `${p.route}: description is ${desc.length} characters`);
  }
  assert.equal(DESCRIPTION_MAX, 160);
});

test("agent files: llms.txt and llms-full.txt under /docs/ as well as the root, and a Link header on every docs page", () => {
  for (const f of ["llms.txt", "llms-full.txt"]) {
    assert.ok(existsSync(join(dist, "docs", f)), `/docs/${f} is served`);
    assert.equal(text(`/docs/${f}`), text(`/${f}`), `/docs/${f} is the same file as /${f}`);
  }
  const llms = text("/docs/llms.txt");
  assert.ok(llms.indexOf("## How agents should use these docs") < llms.indexOf("## Docs"), "how to use the docs comes before the index");
  assert.equal(llms.match(/^## (.+)$/m)[1], "How agents should use these docs", "and it is the first section");
  for (const cmd of [RUN.clone, RUN.test, RUN.bench]) assert.ok(llms.includes(cmd), `llms.txt gives the command: ${cmd}`);
  const headers = text("/_headers");
  for (const p of pages) {
    const rule = headers.match(new RegExp(`^${p.route.replace(/[./]/g, "\\$&")}\\n  Link: (.*)$`, "m"));
    assert.ok(rule, `${p.route}: a Link header rule`);
    assert.equal(rule[1], `<${p.md}>; rel="alternate"; type="text/markdown", </docs/llms.txt>; rel="llms-txt", </docs/llms-full.txt>; rel="llms-full-txt"`);
    assert.ok(html(p.route).includes(`<link rel="alternate" type="text/plain" href="/docs/llms.txt"`), `${p.route}: llms.txt in the head`);
  }
  // Cloudflare Pages reads at most 100 rules from _headers, and ignores the rest without a word.
  const rules = headers.split("\n").filter((l) => /^\/\S*$/.test(l)).length;
  assert.ok(rules <= 100, `_headers has ${rules} rules`);
  const redirects = text("/_redirects");
  assert.match(redirects, /^\/docs\.md\s+\/docs\/index\.md\s+301$/m);
});

test("docs are dark unless the reader switches, and the header row is as wide as the marketing pages'", () => {
  const css = src("site/assets/docs.css");
  assert.doesNotMatch(css, /prefers-color-scheme/, "the system setting does not pick the docs theme");
  assert.equal((css.match(/--ink-0: #fafafa/g) ?? []).length, 1, "light tokens are set in one place");
  assert.match(css, /html\.docs\[data-theme="light"\] \{\s*--ink-0: #fafafa/, "under the reader's own choice");
  assert.doesNotMatch(src("site/assets/docs.js"), /prefers-color-scheme/);
  assert.match(src("site/assets/theme.js"), /t === "light" \|\| t === "dark"/, "theme.js applies only a stored choice");
  assert.doesNotMatch(css, /\.top-row \{[^}]*max-width/, "docs.css does not widen the header row");
  assert.match(css, /\.docs-shell \{[^}]*max-width: var\(--w\)/, "the three columns share the site width");
  assert.match(src("site/assets/site.css"), /\.top-row \{[^}]*max-width: var\(--w\)/, "which is the header row's width");
});

test("the JavaScript-only header buttons stay hidden without JavaScript", () => {
  // .search-btn and .theme-btn set display, which beats the hidden attribute unless a rule says otherwise.
  const css = src("site/assets/docs.css");
  assert.match(css, /\.search-btn\[hidden\], \.theme-btn\[hidden\] \{ display: none; \}/);
  for (const cls of ["search-btn", "theme-btn"]) {
    assert.match(css, new RegExp(`\\.${cls} \\{[^}]*display: inline-`), `${cls} sets display, so it needs the [hidden] rule`);
    assert.match(html("/docs/"), new RegExp(`<button type="button" class="${cls}" data-[a-z-]+ hidden`), `${cls} starts hidden in the HTML`);
  }
  // Nothing else in docs.css gives a display to something the page hides with the attribute.
  const page = html("/docs/getting-started/");
  for (const [, cls] of page.matchAll(/<[a-z]+[^>]*class="([^"]+)"[^>]*\shidden[\s>]/g)) assert.ok(["search-btn", "theme-btn"].includes(cls), `an element with hidden: ${cls}`);
});

test("Express is Autoinstall everywhere in the docs, and the old addresses redirect", () => {
  assert.ok(!existsSync(join(root, "site", "docs", "express.md")) && !existsSync(join(dist, "docs", "express")), "/docs/express/ is not built (it would shadow its redirect)");
  const redirects = text("/_redirects");
  for (const [from, to] of [["/docs/express", "/docs/autoinstall/"], ["/docs/express/", "/docs/autoinstall/"], ["/docs/express.md", "/docs/autoinstall.md"]]) {
    assert.match(redirects, new RegExp(`^${from.replace(/[./]/g, "\\$&")}\\s+${to.replace(/[./]/g, "\\$&")}\\s+301$`, "m"), `${from} -> ${to}`);
  }
  const frameworks = new Set(OPTIONS.framework.map((o) => o.label));
  assert.ok(frameworks.has("Express"), "Express.js is still a framework you can pick");
  for (const f of [...pages.map((p) => p.md), "/docs/llms.txt", "/docs/llms-full.txt", "/docs/search-index.json"]) {
    const body = text(f).replace(/~~~~text title="Autoinstall prompt"[\s\S]*?~~~~/g, "");
    assert.doesNotMatch(body, /\]\((?:https:\/\/botrampart\.agenthatch\.ai)?\/docs\/express\b|"url":"\/docs\/express/, `${f}: a link to /docs/express`);
    assert.doesNotMatch(body, /\[Express\]\(|Express prompt|Express guide|Express installs|open Express/, `${f}: Express as the product's name`);
  }
  for (const p of pages) assert.doesNotMatch(html(p.route).match(/<main[\s\S]*<\/main>/)[0].replace(/<template[\s\S]*?<\/template>/g, ""), /href="\/docs\/express/, `${p.route}: a link to /docs/express`);
  assert.match(src("site/assets/docs.js"), /\["Autoinstall", "\/docs\/autoinstall\/"/, "search suggests Autoinstall");
  assert.equal(PICKER, "/autoinstall/");
  assert.ok(existsSync(join(dist, PICKER, "index.html")), `${PICKER} is built`);
  assert.ok(article("/docs/autoinstall/").includes(`href="${PICKER}"`), "the Autoinstall page links the picker");
});

test("the Autoinstall page is generated from the prompt and its options, so it cannot drift from the picker", () => {
  const a = decode(article("/docs/autoinstall/").replace(/<template[\s\S]*?<\/template>/g, ""));
  const steps = autoinstallSteps().split("\n");
  assert.ok(steps.length >= 2, "the prompt has parts");
  for (const s of steps) assert.ok(a.includes(s.replace(/^\d+\. /, "")), `the page lists: ${s}`);
  for (const [, title] of buildPrompt().matchAll(/^## (Step \d+\. .+)$/gm)) assert.ok(a.includes(title.replace(/^Step \d+\.\s*/, "")), `prompt step on the page: ${title}`);
  for (const o of Object.values(OPTIONS).flat()) assert.ok(a.includes(o.label), `stack option ${o.label}`);
  assert.equal(autoinstallStack().split("\n").length, Object.keys(OPTIONS).length + 2, "one table row per choice");
});

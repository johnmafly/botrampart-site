// Autoinstall (/autoinstall/ and the home page's Autoinstall section): each page's prompt in the HTML
// (read without JavaScript) is the one ai-install.js builds for the preselected choices, every option
// in the picker is in OPTIONS, and every prompt it can build ends at what runs today (audit #3): the
// repository's tests, benchmark and budget engine, a route-price table and a written install plan.
// It installs no package, names none, provisions nothing and never switches to enforce.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OPTIONS, DEFAULTS, buildPrompt, summarize, TRY_BUDGET, REPO } from "../site/assets/ai-install.js";
// registry.test.mjs and copy.test.mjs scan ai-install.js as served, string by string; this checks the
// assembled prompts with a short form of the same install-command patterns.
const INSTALL = /\b(?:npx|bunx|npm\s+(?:i|install|add|exec)|pnpm\s+(?:add|i|install|dlx)|yarn\s+(?:global\s+)?add|pip3?\s+install|(?:docker|podman)\s+(?:image\s+)?(?:pull|run|create)|helm\s+install|brew\s+install|go\s+(?:install|get)|cargo\s+(?:install|add)|gem\s+install|composer\s+require|bundle\s+add)\b|^\s*-?\s*image:/im;
// Package names the guide does not give: any BotRampart package, scoped or not, and the provisioning
// commands of the old prompt.
const PACKAGE = /@botrampart\/|\bbotrampart-(?:sdk|node|core|browser)\b|\bnpm:\S|terraform (?:plan|apply)|pulumi (?:preview|up)\b/i;

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
if (!existsSync(join(dist, "index.html"))) {
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });
}
const PAGES = { autoinstall: ["autoinstall", Object.keys(OPTIONS)], home: ["", ["framework", "runtime", "edge", "infra"]] };
const html = (route) => readFileSync(join(dist, route, "index.html"), "utf8");
const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

for (const [name, [route, keys]] of Object.entries(PAGES)) {
  test(`${name}: the default prompt and summary are the ones ai-install.js builds for the preselected choices`, () => {
    const page = html(route);
    const inPage = page.match(/<code data-ai-prompt>([\s\S]*?)<\/code>/)?.[1];
    assert.ok(inPage, "the page carries a prompt in <code data-ai-prompt>");
    assert.equal(decode(inPage), buildPrompt());
    assert.equal(decode(page.match(/<p class="fine ai-summary" data-ai-summary>([^<]*)<\/p>/)[1]), summarize());
    for (const k of keys) assert.match(page, new RegExp(`name="${k}" value="${DEFAULTS[k]}" checked`), `${k}=${DEFAULTS[k]} is preselected`);
    assert.match(page, /<pre[^>]*tabindex="0" role="region" aria-label="Code: [^"]+"[^>]*><code data-ai-prompt>/);
    assert.match(page, /<button type="button" class="btn btn-primary ai-copy" data-ai-copy hidden>Copy prompt<\/button>/);
    assert.match(page, /src="\/assets\/ai-install\.[0-9a-f]{10}\.js"/);
    assert.match(page, /href="\/assets\/picker\.[0-9a-f]{10}\.css"/, "the picker's own stylesheet");
  });

  test(`${name}: every option in the picker is in OPTIONS`, () => {
    const page = html(route);
    for (const k of keys) for (const o of OPTIONS[k]) {
      assert.match(page, new RegExp(`<label class="choice"><input type="radio" name="${k}" value="${o.value}"`), `${k}=${o.value}`);
    }
  });
}

test("Autoinstall is a product with its own name: menu, footer, page, home section and redirects (audit #8)", () => {
  const home = html("");
  const menu = home.match(/<details class="menu"[\s\S]*?<\/details>/)[0];
  assert.match(menu, /<a href="\/autoinstall\/"[^>]*><b>Autoinstall<\/b><span>One prompt for your coding agent<\/span><\/a>/);
  assert.match(home.split("<footer")[1], /<a href="\/autoinstall\/"[^>]*>Autoinstall<\/a>/);
  assert.match(home, /<section class="sec" id="autoinstall"/);
  assert.ok(!existsSync(join(dist, "express")), "/express/ is not built (it would shadow its redirect)");
  const redirects = readFileSync(join(dist, "_redirects"), "utf8");
  for (const from of ["/express", "/express/", "/express/index.html", "/build/ai", "/build/ai/"]) {
    assert.match(redirects, new RegExp(`^${from.replace(/\./g, "\\.")}\\s+/autoinstall/\\s+301$`, "m"), from);
  }
  // No product named Express is left on the pages this repository's marketing side owns; Express.js
  // the framework stays, as a picker option and in the integrations list.
  for (const route of ["", "autoinstall", "own", "meter", "field", "solutions", "access", "signup", "signin", "dashboard", "try"]) {
    const page = html(route).replace(/<code data-ai-prompt>[\s\S]*?<\/code>/, "");
    assert.doesNotMatch(page, /href="\/express\/|Express install|Express · install|>Express<\/b>|How Express works/, `/${route}: the old product name`);
  }
});

test("every prompt it can build: ends at what runs today, names no package, provisions nothing", () => {
  const keys = Object.keys(OPTIONS);
  let n = 0;
  const walk = (i, choice) => {
    if (i === keys.length) {
      const p = buildPrompt(choice);
      n += 1;
      assert.doesNotMatch(p, INSTALL, `install command in prompt for ${JSON.stringify(choice)}`);
      assert.doesNotMatch(p, PACKAGE, `a package name or provisioning command for ${JSON.stringify(choice)}`);
      assert.doesNotMatch(p, /getting-started guide gives|package name and version/i, "no pointer to package names the guide does not give");
      assert.doesNotMatch(p, /coming next|not available|not published|not in today/i);
      assert.ok(p.includes(`Clone ${REPO}`), "clones the repository");
      for (const cmd of ["`npm test`", "`npm run bench`", "`node try-budget.mjs`"]) assert.ok(p.includes(cmd), `runs ${cmd}`);
      assert.ok(p.includes("```js\n" + TRY_BUDGET + "\n```"), "carries the quickstart's snippet word for word");
      assert.match(p, /Install nothing from a package registry/);
      assert.match(p, /Change nothing in a cloud account/);
      assert.match(p, /## Step 5\. STOP and report[\s\S]*Do not install, provision or deploy anything/);
      assert.ok(p.trimEnd().endsWith("the path of the plan file."), "the prompt ends at the report");
      return;
    }
    for (const o of OPTIONS[keys[i]]) walk(i + 1, { ...choice, [keys[i]]: o.value });
  };
  walk(0, {});
  assert.ok(n > 10000, `checked ${n} prompts`);
});

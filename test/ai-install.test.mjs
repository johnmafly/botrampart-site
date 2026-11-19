// Express (/express/ and the home page's Express section): each page's prompt in the HTML (read
// without JavaScript) is the one ai-install.js builds for the preselected choices, every option in
// the picker is in OPTIONS, and every prompt it can build covers install and provisioning, carries
// no registry install command, and never switches to enforce.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OPTIONS, DEFAULTS, buildPrompt } from "../site/assets/ai-install.js";
// registry.test.mjs and copy.test.mjs scan ai-install.js as served, string by string; this checks the
// assembled prompts with a short form of the same install-command patterns.
const INSTALL = /\b(?:npx|bunx|npm\s+(?:i|install|add|exec)|pnpm\s+(?:add|i|install|dlx)|yarn\s+(?:global\s+)?add|pip3?\s+install|(?:docker|podman)\s+(?:image\s+)?(?:pull|run|create)|helm\s+install|brew\s+install|go\s+(?:install|get)|cargo\s+(?:install|add)|gem\s+install|composer\s+require|bundle\s+add)\b|^\s*-?\s*image:/im;

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
if (!existsSync(join(dist, "index.html"))) {
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });
}
const PAGES = { express: ["express", Object.keys(OPTIONS)], home: ["", ["framework", "runtime", "edge", "infra"]] };
const html = (route) => readFileSync(join(dist, route, "index.html"), "utf8");
const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

for (const [name, [route, keys]] of Object.entries(PAGES)) {
  test(`${name}: the default prompt is the one ai-install.js builds for the preselected choices`, () => {
    const page = html(route);
    const inPage = page.match(/<code data-ai-prompt>([\s\S]*?)<\/code>/)?.[1];
    assert.ok(inPage, "the page carries a prompt in <code data-ai-prompt>");
    assert.equal(decode(inPage), buildPrompt());
    for (const k of keys) assert.match(page, new RegExp(`name="${k}" value="${DEFAULTS[k]}" checked`), `${k}=${DEFAULTS[k]} is preselected`);
    assert.match(page, /<pre[^>]*tabindex="0" role="region" aria-label="Code: [^"]+"[^>]*><code data-ai-prompt>/);
    assert.match(page, /<button type="button" class="btn btn-primary ai-copy" data-ai-copy hidden>Copy prompt<\/button>/);
    assert.match(page, /src="\/assets\/ai-install\.[0-9a-f]{10}\.js"/);
  });

  test(`${name}: every option in the picker is in OPTIONS`, () => {
    const page = html(route);
    for (const k of keys) for (const o of OPTIONS[k]) {
      assert.match(page, new RegExp(`<label class="choice"><input type="radio" name="${k}" value="${o.value}"`), `${k}=${o.value}`);
    }
  });
}

test("Express is a first-class product: menu, footer, page, docs and llms.txt", () => {
  const home = html("");
  const menu = home.match(/<details class="menu"[\s\S]*?<\/details>/)[0];
  assert.match(menu, /<a href="\/express\/"[^>]*><b>Express<\/b><span>Install with one AI prompt<\/span><\/a>/);
  assert.match(home.split('<footer')[1], /<a href="\/express\/"[^>]*>Express<\/a>/);
  assert.match(home, /id="express"/);
  assert.ok(existsSync(join(dist, "docs", "express.md")));
  assert.match(readFileSync(join(dist, "llms.txt"), "utf8"), /\/docs\/express\.md/);
  assert.match(readFileSync(join(dist, "_redirects"), "utf8"), /^\/build\/ai\/\s+\/express\/\s+301$/m);
});

test("every prompt it can build: install and provisioning, no install command, observe mode only", () => {
  const keys = Object.keys(OPTIONS);
  let n = 0;
  const walk = (i, choice) => {
    if (i === keys.length) {
      const p = buildPrompt(choice);
      n += 1;
      assert.doesNotMatch(p, INSTALL, `install command in prompt for ${JSON.stringify(choice)}`);
      assert.doesNotMatch(p, /coming next|not available|not published|not in today/i);
      assert.match(p, /## Step 2\. Provision the infrastructure/);
      assert.match(p, /## Step 3\. Install the SDK in the app/);
      assert.match(p, /STOP after the plan or preview/);
      assert.match(p, /Do not switch to enforce mode/);
      for (const name of ["BR_LAKE_URL", "BR_DECISION_PROVIDER", "br_keys", "lake_writer", "BR-Decision", "getDecision"]) assert.ok(p.includes(name), `${name} in prompt`);
      return;
    }
    for (const o of OPTIONS[keys[i]]) walk(i + 1, { ...choice, [keys[i]]: o.value });
  };
  walk(0, {});
  assert.ok(n > 10000, `checked ${n} prompts`);
});

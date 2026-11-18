// Express AI install (/build/ai/): the prompt in the page's HTML (read without JavaScript) is the one
// ai-install.js builds for the preselected choices, and every prompt it can build stays honest:
// no registry install command, the packages named as not published yet, and every option that is
// not available yet said to be so.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { OPTIONS, DEFAULTS, buildPrompt } from "../site/assets/ai-install.js";
// registry.test.mjs and copy.test.mjs scan ai-install.js as served, string by string; this checks the
// assembled prompts with a short form of the same install-command patterns.
const INSTALL = /\b(?:npx|bunx|npm\s+(?:i|install|add|exec)|pnpm\s+(?:add|i|install|dlx)|yarn\s+(?:global\s+)?add|pip3?\s+install|(?:docker|podman)\s+(?:image\s+)?(?:pull|run|create)|helm\s+install|brew\s+install|go\s+(?:install|get)|cargo\s+(?:install|add)|gem\s+install)\b|^\s*-?\s*image:/im;

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
if (!existsSync(join(dist, "index.html"))) {
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });
}
const html = readFileSync(join(dist, "build", "ai", "index.html"), "utf8");
const decode = (s) => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");

test("the page's default prompt is the one ai-install.js builds for the preselected choices", () => {
  const inPage = html.match(/<code data-ai-prompt>([\s\S]*?)<\/code>/)?.[1];
  assert.ok(inPage, "the page carries a prompt in <code data-ai-prompt>");
  assert.equal(decode(inPage), buildPrompt(), "regenerate the HTML default from buildPrompt()");
  for (const [name, value] of Object.entries(DEFAULTS)) {
    assert.match(html, new RegExp(`name="${name}" value="${value}" checked`), `${name}=${value} is preselected`);
  }
  assert.match(html, /<pre[^>]*tabindex="0" role="region" aria-label="Code: [^"]+"[^>]*><code data-ai-prompt>/);
});

test("every option in the form is in OPTIONS, and the ones not available yet are marked", () => {
  for (const [name, opts] of Object.entries(OPTIONS)) {
    for (const o of opts) {
      const label = html.match(new RegExp(`<label class="choice[^"]*"><input type="radio" name="${name}" value="${o.value}"[^>]*><span>([\\s\\S]*?)</span></label>`));
      assert.ok(label, `${name}=${o.value} is in the form`);
      assert.equal(/Not available yet/.test(label[1]), !o.available, `${name}=${o.value} marked as ${o.available ? "available" : "not available yet"}`);
    }
  }
});

test("every prompt it can build: no install command, packages not published, unavailable choices named", () => {
  const keys = Object.keys(OPTIONS);
  let n = 0;
  const walk = (i, choice) => {
    if (i === keys.length) {
      const p = buildPrompt(choice);
      n += 1;
      assert.doesNotMatch(p, INSTALL, `install command in prompt for ${JSON.stringify(choice)}`);
      assert.match(p, /packages are not published yet/);
      assert.match(p, /observe/);
      assert.match(p, /Do not switch to enforce mode/);
      for (const name of ["BR_LAKE_URL", "BR_DECISION_PROVIDER", "br_keys", "lake_writer", "BR-Decision", "getDecision"]) assert.ok(p.includes(name), `${name} in prompt`);
      for (const k of ["framework", "integration"]) {
        if (!OPTIONS[k].find((o) => o.value === choice[k]).available) assert.match(p, /not available yet|no BotRampart SDK/i, `${k}=${choice[k]} said to be unavailable`);
      }
      return;
    }
    for (const o of OPTIONS[keys[i]]) walk(i + 1, { ...choice, [keys[i]]: o.value });
  };
  walk(0, {});
  assert.ok(n > 1000, `checked ${n} prompts`);
});

// Intake non-goals (portfolio/botrampart/intake.yaml in johnmafly/greenhouse) never read as shipping.
// The overview lists every one under "Not available yet", every served page that names one says
// so, the paid editions carry the mark, and the example policy uses none of them.
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
const page = (route) => readFileSync(join(dist, route, "index.html"), "utf8");
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/g, " ").replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const NOT_YET = /not available yet/i;

// One entry per intake non-goal: a pattern for it in the overview's list.
const NON_GOALS = [
  ["Vector log pack", /Vector log pack/],
  ["tier 3 step-up and third-party widgets", /Tier 3 step-up methods and third-party challenge widgets/],
  ["console beyond a read-only view", /console is a read-only view/i],
  ["free-form SQL, policy suggestions and email from the agent", /Free-form SQL, suggested policy changes and email from the agent/],
  ["SDKs other than Node", /SDKs other than Node/],
  ["Cloud billing, white-label and SSO", /Cloud and its billing, the White-label build and single sign-on/],
  ["a published benchmark site", /published benchmark site/],
  ["edge adapters, mobile SDKs and Web Bot Auth", /Edge adapters, mobile SDKs and Web Bot Auth/],
  ["mobile apps and partner APIs as protected clients", /Native mobile apps and partner APIs as protected clients/],
  ["the decision model acting live", /decision model acting live/],
];

test("the overview lists every intake non-goal under Not available yet", () => {
  const html = page("docs/overview");
  const section = html.split('id="not-yet"')[1];
  assert.ok(section, "/docs/overview/ has #not-yet");
  const body = text(section.split(/<h2\b/)[0]);
  for (const [name, re] of NON_GOALS) assert.match(body, re, name);
});

// Pages that name a non-goal feature must also say it is not available yet.
const ROUTES = ["", "meter", "own", "field", "docs/overview", "docs/features", "docs/architecture", "docs/integrations",
  "docs/configuration", "docs/self-hosting", "docs/policy", "docs/security", "docs/faq"];
const MARKERS = [/Vector log pack|log pack/i, /step-up/i, /White-label/, /suggest(ed)? policy change/i, /free-form SQL/i];
test("every page that names a non-goal feature says it is not available yet", () => {
  for (const r of ROUTES) {
    const t = text(page(r).split("<!-- @sources")[0].replace(/<section[^>]*class="[^"]*sources[\s\S]*$/, ""));
    for (const m of MARKERS) if (m.test(t)) assert.match(t, NOT_YET, `/${r}/ names ${m} without "not available yet"`);
  }
});

test("each paid edition on /own/ is marked not available yet; Community is not", () => {
  const html = page("own");
  for (const name of ["White-label", "Enterprise", "Cloud"]) {
    const card = html.match(new RegExp(`<h3>${name}</h3>[\\s\\S]*?</div>`))?.[0];
    assert.ok(card && NOT_YET.test(card), `${name} card is marked`);
  }
  const community = html.match(/<h3>Community<\/h3>[\s\S]*?<\/div>/)[0];
  assert.doesNotMatch(community, NOT_YET);
});

test("the example policy uses no non-goal: no Web Bot Auth rule, no step-up challenge", () => {
  for (const src of [readFileSync(join(root, "spec", "openapi.yaml"), "utf8"), readFileSync(join(root, "site", "docs", "policy.md"), "utf8")]) {
    assert.doesNotMatch(src, /web_bot_auth/);
    assert.doesNotMatch(src, /then: "challenge\(step_up\)"/);
  }
});

// Billing follows the rule, not the slogan: sessions that pass the proof-of-work are billed, and a
// headless browser can pass it, so no headline promises that bots are never billed.
test("/own/ billing copy does not promise bots are never billed", () => {
  const t = text(page("own"));
  assert.doesNotMatch(t, /never for bots|bots are never billed|bots that never pass are never billed/i);
  assert.match(t, /headless browser that solves the proof-of-work does count as a session/);
});

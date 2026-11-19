// Intake non-goals (portfolio/botrampart/intake.yaml in johnmafly/greenhouse) never read as shipping.
// The overview lists every one under "Coming next", every served page that names one marks it as
// coming next, the paid editions carry the mark, and the example policy uses none of them. No served
// file says "not available yet": the site shows what comes next as part of the product, not a warning.
import { readdirSync } from "node:fs";
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
const NEXT = /coming next/i;

// One entry per intake non-goal: a pattern for it in the overview's list.
const NON_GOALS = [
  ["Vector log pack", /Vector log pack/],
  ["tier 3 step-up and third-party widgets", /Tier 3 step-up methods and third-party challenge widgets/],
  ["console beyond a read-only view", /console is a read-only view/i],
  ["free-form SQL, policy suggestions and email from the agent", /Free-form SQL, suggested policy changes and email from the agent/],
  ["SDKs other than Node", /SDKs other than Node/],
  ["Cloud billing, white-label and SSO", /Cloud and its billing, the White-label build and single sign-on/],
  ["published benchmark results", /Published bot-detection benchmark results/],
  ["edge adapters", /Edge adapters: the nginx module, the Cloudflare Worker and CloudFront/],
  ["mobile SDKs and Web Bot Auth", /Mobile SDKs and Web Bot Auth/],
  ["mobile apps and partner APIs as protected clients", /Native mobile apps and partner APIs as protected clients/],
  ["the decision model acting live", /decision model acting live/],
];

test("the overview lists every intake non-goal under Coming next", () => {
  const html = page("docs/overview");
  const section = html.split('id="next"')[1];
  assert.ok(section, "/docs/overview/ has #next");
  const body = text(section.split(/<h2\b/)[0]);
  for (const [name, re] of NON_GOALS) assert.match(body, re, name);
});

// Pages that name a non-goal feature must also mark it as coming next.
const ROUTES = ["", "meter", "own", "field", "docs/overview", "docs/features", "docs/architecture", "docs/integrations",
  "docs/configuration", "docs/self-hosting", "docs/policy", "docs/security", "docs/faq",
  "build", "build/wire", "build/ai", "dashboard", "signup", "signin"];
const MARKERS = [/Vector log pack|log pack/i, /step-up/i, /White-label/, /suggest(ed)? policy change/i, /free-form SQL/i,
  /nginx module/i, /Cloudflare Worker/i, /CloudFront/, /benchmark/i];
test("every page that names a non-goal feature marks it as coming next", () => {
  for (const r of ROUTES) {
    const t = text(page(r).split("<!-- @sources")[0].replace(/<section[^>]*class="[^"]*sources[\s\S]*$/, ""));
    for (const m of MARKERS) if (m.test(t)) assert.match(t, NEXT, `/${r}/ names ${m} without "coming next"`);
  }
});

test("each paid edition on /own/ is marked coming next; Community is not", () => {
  const html = page("own");
  for (const name of ["White-label", "Enterprise", "Cloud"]) {
    const card = html.match(new RegExp(`<h3>${name}</h3>[\\s\\S]*?</div>`))?.[0];
    assert.ok(card && NEXT.test(card), `${name} card is marked`);
  }
  const community = html.match(/<h3>Community<\/h3>[\s\S]*?<\/div>/)[0];
  assert.doesNotMatch(community, NEXT);
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

// The backend SDK stays light: the pages that describe it say it keeps no aggregated visitor metrics.
test("the SDK pages say the SDK keeps no aggregated visitor metrics", () => {
  for (const r of ["build", "build/wire"]) assert.match(text(page(r)), /keeps no aggregated visitor metrics/, `/${r}/`);
  assert.match(readFileSync(join(root, "site", "docs", "sdk.md"), "utf8"), /keeps no aggregated visitor metrics/);
});

// The owner's call: no served file carries "not available yet" or "unavailable" as a feature label.
test("no served file says not available yet or not measured yet", () => {
  const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
  for (const f of walk(dist).filter((f) => /\.(html|md|txt|js|mjs|css|svg|json|yaml|xml)$/.test(f))) {
    assert.doesNotMatch(readFileSync(f, "utf8"), /not available yet|not measured yet/i, f.slice(dist.length));
  }
});

// Vision-first (owner's standing rule, 2026-11-19): every feature is shown as working. No served
// file frames a feature as coming next, not available yet or not measured yet, and the overview has
// no "Coming next" section. Mock figures stay beside "Sample figures for the private preview" and in
// MOCK_FIGURES.md (package.test.mjs). The billing, SDK-footprint and example-policy rules stay.
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
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]);
const served = () => walk(dist).filter((f) => /\.(html|md|txt|js|mjs|css|svg|json|yaml|xml)$/.test(f));

test("the overview has no Coming next section and nothing links to one", () => {
  assert.doesNotMatch(page("docs/overview"), /id="next"|Where BotRampart goes from here/);
  for (const f of served()) assert.doesNotMatch(readFileSync(f, "utf8"), /\/docs\/overview\/#next/, f.slice(dist.length));
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

// The owner's call: no served file frames a feature as waiting.
const WAITING = /coming next|not available yet|not measured yet/i;
test("no served file says coming next, not available yet or not measured yet", () => {
  for (const f of served()) assert.doesNotMatch(readFileSync(f, "utf8"), WAITING, f.slice(dist.length));
});

test("the waiting-phrase check catches each phrase in any case", () => {
  for (const t of ["Coming next", "COMING NEXT", "Not available yet", "not measured yet"]) assert.match(t, WAITING, t);
  assert.doesNotMatch("What comes next in the guide", WAITING);
});

// The owner asked for IntelliFend to be removed from the site.
test("no served file mentions IntelliFend", () => {
  for (const f of served()) assert.doesNotMatch(readFileSync(f, "utf8"), /intellifend/i, f.slice(dist.length));
});

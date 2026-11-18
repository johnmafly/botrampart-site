// The cost model (costs/model.mjs, greenhouse.yaml cost_model:) reconciles with the site's prices,
// traces every figure to a source or a stated assumption, and prices nothing below cost except a
// free tier declared as acquisition.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { TIERS, PRICES, SOURCES, ASSUMPTIONS, costToServe, marginalPer1k, selfHostReference } from "../costs/model.mjs";
import { withCostModel } from "../scripts/cost-model.mjs";
import { readClaims } from "../scripts/claims.mjs";

const root = new URL("..", import.meta.url).pathname;
const read = (...p) => readFileSync(join(root, ...p), "utf8");
const own = read("site", "own", "index.html");
const text = (html) => html.replace(/\{\{c:[^}]+\}\}/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

test("greenhouse.yaml cost_model is generated from the current workings", () => {
  const yaml = read("greenhouse.yaml");
  assert.match(yaml, /^cost_model:$/m);
  assert.equal(yaml, withCostModel(yaml), "run npm run cost-model");
  for (const key of ["content:", "slug:", "build:"]) assert.ok(yaml.includes(key), `greenhouse.yaml keeps ${key}`);
});

// Greenhouse's pricing gate reads only the pricing_page (and only inside its #anchor when it has
// one), so every tier's name and price has to be in that part of the page.
function elementById(html, id) {
  const open = new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*\\bid=["']?${id}["'\\s>]`, "i").exec(html);
  if (!open) return null;
  const tag = open[1].toLowerCase();
  const re = new RegExp(`<(/?)${tag}\\b[^>]*>`, "gi");
  re.lastIndex = open.index;
  let depth = 0;
  for (let m; (m = re.exec(html)); ) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return html.slice(open.index, re.lastIndex);
  }
  return html.slice(open.index);
}

test("the cost model's pricing_page shows every tier's name and price", () => {
  const page = /^  pricing_page: "([^"]+)"$/m.exec(read("greenhouse.yaml"))?.[1];
  assert.ok(page, "greenhouse.yaml cost_model has a pricing_page");
  const [path, anchor] = page.split("#");
  assert.equal(path, "/own/", "pricing_page is the /own/ page");
  const scope = anchor ? elementById(own, anchor) : own;
  assert.ok(scope, `#${anchor} is on /own/`);
  const seen = text(scope);
  for (const t of TIERS) {
    assert.match(seen, new RegExp(`(^|[^\\p{L}\\p{N}])${t.name}($|[^\\p{L}\\p{N}])`, "iu"), `${page} names ${t.name}`);
    const price = t.price === 0 ? /\$0(?![\d.])|\bfree\b/i : new RegExp(`\\$${t.price}(?![\\d.])`);
    assert.match(seen, price, `${page} shows ${t.name}'s price ${t.price}`);
  }
});

test("every edition's name and price matches /own/", () => {
  const cards = [...own.matchAll(/<div class="ed[^"]*">\s*<span class="kind">([^<]+)<\/span>\s*<h3>([^<]+)<\/h3>\s*<p class="price">([^<]+)<small>/g)]
    .map(([, kind, name, price]) => ({ kind: kind.trim().toLowerCase(), name: name.trim(), price: price.trim() }));
  assert.equal(cards.length, 4, "four edition cards");
  for (const t of TIERS.filter((t) => t.kind === "self-hosted")) {
    const card = cards.find((c) => c.name === t.name);
    assert.ok(card, `/own/ shows the ${t.name} edition`);
    assert.equal(card.kind, "self-hosted");
    assert.equal(card.price, t.price_label, `${t.name} price`);
  }
  assert.ok(cards.some((c) => c.name === "Cloud" && c.kind === "hosted"), "/own/ shows the Cloud edition");
});

test("every Cloud plan's name, fee, allowance, overage and cohort limit match /own/ and the calculator", () => {
  const rows = [...own.matchAll(/<tr><th scope="row">([^<]+)<\/th>((?:<td[^>]*>.*?<\/td>){4})<\/tr>/g)]
    .map(([, name, cells]) => [name, [...cells.matchAll(/<td[^>]*>(.*?)<\/td>/g)].map((m) => text(m[1]))]);
  const calc = read("site", "assets", "pricing.js");
  for (const t of TIERS.filter((t) => t.kind === "cloud")) {
    const row = rows.find(([name]) => name === t.name);
    assert.ok(row, `/own/ Cloud table has ${t.name}`);
    const [fee, included, per1k, cohorts] = row[1];
    assert.equal(fee, `$${t.price}`, `${t.name} fee`);
    assert.equal(included, t.included.toLocaleString("en-US"), `${t.name} included sessions`);
    if (t.per1k == null) assert.match(per1k, /paused at the cap/);
    else assert.equal(per1k, `$${t.per1k.toFixed(2)}`, `${t.name} overage`);
    assert.equal(cohorts, t.cohorts === 0 ? "site only" : String(t.cohorts), `${t.name} cohorts`);
    const plan = new RegExp(`\\{ name: "${t.name}", fee: ${t.price}, included: ${t.included.toLocaleString("en-US").replace(/,/g, "_")}, per1k: ${t.per1k ?? "null"} \\}`);
    assert.match(calc, plan, `pricing.js plan ${t.name}`);
  }
});

test("nothing is priced below cost; a free tier below cost says why", () => {
  for (const t of TIERS) {
    const { total } = costToServe(t);
    if (t.price > 0) assert.ok(t.price >= total, `${t.name}: $${t.price} is below its cost to serve, $${total.toFixed(2)}`);
    else if (total > 0) assert.ok(t.acquisition, `${t.name} is free and costs $${total.toFixed(2)}: declare it as acquisition`);
    const m = marginalPer1k(t);
    if (m != null) assert.ok(t.per1k >= m, `${t.name}: overage $${t.per1k} per 1,000 is below its marginal cost $${m.toFixed(4)}`);
  }
  assert.equal(costToServe(TIERS.find((t) => t.name === "Community")).total, 0, "Community costs us nothing to serve");
});

test("every list price traces to claims.yaml or a quoted source, and every assumption states its basis", () => {
  const claims = new Map(readClaims(join(root, "claims.yaml")).map((c) => [c.id, c]));
  for (const [key, price] of Object.entries(PRICES)) {
    const source = SOURCES[price.source];
    assert.ok(source, `${key}: unknown source ${price.source}`);
    const sourced = source.claim ? claims.get(source.claim)?.claim : source.quote;
    assert.ok(sourced, `${key}: ${source.claim ? `claim ${source.claim} is not in claims.yaml` : "no quote"}`);
    assert.ok(price.as_quoted && sourced.includes(price.as_quoted), `${key}: "${price.as_quoted}" is not in its source text`);
  }
  for (const [id, s] of Object.entries(SOURCES)) {
    if (s.claim) continue;
    assert.match(s.source_url, /^https:\/\//, `${id} source_url`);
    assert.match(s.checked, /^\d{4}-\d{2}-\d{2}$/, `${id} checked`);
  }
  for (const [key, v] of Object.entries(ASSUMPTIONS)) assert.match(v.basis, /^(site|ours): \S/, `${key} basis`);
});

test("the workings reproduce the self-hosting estimate on /own/", () => {
  const ref = selfHostReference();
  const selfhost = text(own.slice(own.indexOf('id="selfhost"'), own.indexOf("Promises")));
  assert.match(selfhost, /Core on Cloudflare Workers Paid about \$5 to \$10/);
  assert.ok(ref.core >= 5 && ref.core <= 10, `Core $${ref.core}`);
  assert.match(selfhost, /one site-level call every 5 minutes about \$2/);
  assert.equal(Math.round(ref.decision_model_site_level), 2);
  assert.match(selfhost, /up to about \$80/);
  assert.ok(ref.decision_model_all_cohorts <= 80, `all cohorts $${ref.decision_model_all_cohorts}`);
  assert.match(selfhost, /a few dollars/);
  assert.ok(ref.decision_log < 5, `decision log $${ref.decision_log}`);
});

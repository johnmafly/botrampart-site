// BotRampart cost workings: what each edition and Cloud plan costs us to serve each month, and
// what self-hosting costs the person running it. scripts/cost-model.mjs writes the result into
// greenhouse.yaml (cost_model:), and test/cost-model.test.mjs fails when that block drifts from
// these workings, when a price on the site differs from a price here, or when a paid tier is
// priced below its cost to serve.
//
// Every number here is one of three kinds:
//   - a list price from claims.yaml (`claim: "<id>"`), already quoted and dated there;
//   - a list price quoted here (`source_url`, verbatim `quote`, `checked`), from pages the site
//     does not cite;
//   - our own assumption (`basis` says where it comes from). These are the numbers to replace
//     with measurements once the first build runs.
// All prices are proposals; nothing is for sale.

export const SOURCES = {
  "cf-workers-price": { claim: "cf-workers-price" },
  "r2-price": { claim: "r2-price" },
  "gd-price": { claim: "gd-price" },
  "cf-workers-overage": {
    source_url: "https://developers.cloudflare.com/workers/platform/pricing/",
    quote: "Standard 10 million included per month +$0.30 per additional million No charge or limit for duration 30 million CPU milliseconds included per month +$0.02 per additional million CPU milliseconds",
    checked: "2026-11-18",
  },
  "cf-do-price": {
    source_url: "https://developers.cloudflare.com/durable-objects/platform/pricing/",
    quote: "400,000 GB-s / month, + $12.50/million GB-s",
    checked: "2026-11-18",
  },
  "cf-do-rows": {
    source_url: "https://developers.cloudflare.com/durable-objects/platform/pricing/",
    quote: "First 50 million / month included + $1.00 / million rows",
    checked: "2026-11-18",
  },
  "cf-do-requests": {
    source_url: "https://developers.cloudflare.com/durable-objects/platform/pricing/",
    quote: "requests x $0.15 / 1,000,000 = $0.15",
    checked: "2026-11-18",
  },
  "cf-do-128mb": {
    source_url: "https://developers.cloudflare.com/durable-objects/platform/pricing/",
    quote: "1,000,000 seconds * 128 MB / 1 GB = 128,000 GB-s",
    checked: "2026-11-18",
  },
  "r2-class-a": {
    source_url: "https://developers.cloudflare.com/r2/pricing/",
    quote: "Class A Operations $4.50 / million requests",
    checked: "2026-11-18",
  },
  "r2-free": {
    source_url: "https://developers.cloudflare.com/r2/pricing/",
    quote: "Free Storage 10 GB-month / month Class A Operations 1 million requests / month",
    checked: "2026-11-18",
  },
  // stripe.com/pricing redirects this machine (Singapore) to the en-sg page. Its domestic-card rate
  // is higher than the US one, so using it overstates our cost rather than understating it.
  "card-fee": {
    source_url: "https://stripe.com/en-sg/pricing",
    quote: "3.4% + $0.50 per successful transaction for domestic cards",
    checked: "2026-11-18",
  },
  // US Department of Labor, CareerOneStop wages for Software Developers (SOC 15-1252), 2025, United
  // States, hourly: low, median, high. Refuses scripted requests (403); fetched through a reader.
  // We use the high figure as a conservative stand-in for a loaded support-engineer hour.
  "dev-wage": {
    source_url: "https://www.careeronestop.org/Toolkit/Wages/find-salary.aspx?dataview=table&hourly=False&keyword=Software+Developers&location=California&national=True&soccode=151252",
    quote: "United States Hourly $39.64 $65.38 $103.21",
    checked: "2026-11-18",
  },
};

// List prices, USD.
export const PRICES = {
  workers_paid_month: { value: 5, source: "cf-workers-price", as_quoted: "$5 a month" },
  workers_included_requests: { value: 10_000_000, source: "cf-workers-price", as_quoted: "10 million requests included" },
  workers_per_m_requests: { value: 0.3, source: "cf-workers-overage", as_quoted: "+$0.30 per additional million" },
  workers_included_cpu_ms: { value: 30_000_000, source: "cf-workers-overage", as_quoted: "30 million CPU milliseconds included" },
  workers_per_m_cpu_ms: { value: 0.02, source: "cf-workers-overage", as_quoted: "+$0.02 per additional million CPU milliseconds" },
  do_per_m_requests: { value: 0.15, source: "cf-do-requests", as_quoted: "$0.15 / 1,000,000" },
  do_included_gbs: { value: 400_000, source: "cf-do-price", as_quoted: "400,000 GB-s / month" },
  do_per_m_gbs: { value: 12.5, source: "cf-do-price", as_quoted: "$12.50/million GB-s" },
  do_gb_per_object: { value: 0.128, source: "cf-do-128mb", as_quoted: "128 MB" },
  do_included_rows_written: { value: 50_000_000, source: "cf-do-rows", as_quoted: "First 50 million / month included" },
  do_per_m_rows_written: { value: 1, source: "cf-do-rows", as_quoted: "$1.00 / million rows" },
  r2_per_gb_month: { value: 0.015, source: "r2-price", as_quoted: "$0.015 per GB-month" },
  r2_included_class_a: { value: 1_000_000, source: "r2-free", as_quoted: "Class A Operations 1 million requests / month" },
  r2_per_m_class_a: { value: 4.5, source: "r2-class-a", as_quoted: "$4.50 / million requests" },
  model_per_m_input_tokens: { value: 0.1, source: "gd-price", as_quoted: "$0.10 per million input tokens" },
  card_fee_rate: { value: 0.034, source: "card-fee", as_quoted: "3.4%" },
  card_fee_fixed: { value: 0.5, source: "card-fee", as_quoted: "$0.50" },
  support_hour: { value: 103.21, source: "dev-wage", as_quoted: "$103.21" },
};

// Our assumptions. The first four are the ones the site already states (/own/#selfhost and
// /build/inside/#core); the rest are new here.
export const ASSUMPTIONS = {
  sessions_per_100m_requests: { value: 5_000_000, basis: "site: /own/ (planning assumption, about 5 million sessions for 100 million requests)" },
  sessions_per_instance: { value: 500_000, basis: "site: /build/inside/#core (10 app instances for that site)" },
  sync_seconds: { value: 10, basis: "site: /build/inside/#core (each instance syncs every 10 seconds)" },
  escalation_share: { value: 0.06, basis: "site: /build/inside/#core (about 0.3 million escalated challenges for 5 million sessions)" },
  model_tokens_per_call: { value: 1800, basis: "site: /own/#selfhost (1,800 tokens a model call)" },
  model_window_minutes: { value: 5, basis: "site: /meter/ (Core builds a state every five minutes)" },
  max_cohorts: { value: 50, basis: "site: /own/#selfhost (decision model per abnormal cohort, up to 50)" },
  cpu_ms_per_core_call: { value: 5, basis: "ours: a sync merges counters and returns policy; no crypto beyond one signature check" },
  rows_written_per_sync: { value: 1, basis: "ours: one counter row per instance per sync in the site shard" },
  rows_written_per_session: { value: 10, basis: "ours: a session's minute rollups, its token and replay rows in the site shard" },
  lake_tables: { value: 6, basis: "site: /build/inside/ (lake tables written every minute)" },
  lake_kb_per_session_month: { value: 2, basis: "ours: compressed parquet rows for one session's rollups, challenges and decisions" },
  lake_retention_months: { value: 3, basis: "site: /build/inside/ (90 days proposed retention)" },
  // Worst case for the model: every watched cohort misses the one-hour answer cache in every window.
  model_cache_misses_every_window: { value: true, basis: "ours: worst case; /meter/ says answers are cached up to an hour" },
  // We allocate the whole Workers Paid minimum to every Cloud plan, as if each were our only customer,
  // and ignore Cloudflare's included allowances for Cloud (they are per account, not per customer).
  allocate_platform_minimum_per_plan: { value: true, basis: "ours: conservative" },
};

const MONTH_SECONDS = 30 * 86_400;
const MONTH_MINUTES = 30 * 1_440;
const MONTH_HOURS = 30 * 24;
const p = (k) => PRICES[k].value;
const a = (k) => ASSUMPTIONS[k].value;
const round2 = (x) => Math.round(x * 100) / 100;

// Editions and plans exactly as /own/ shows them. `cohorts` is the Cloud plan's limit on abnormal
// cohorts the decision model watches (0: one site-level question per window only); `support_hours`
// is the time a month we plan to spend on that customer.
export const TIERS = [
  { key: "community", name: "Community", edition: "Community", kind: "self-hosted", price: 0, price_label: "Free", support_hours: 0,
    serves: "nothing: the person runs every part on their own account; we publish releases from public CI" },
  { key: "white-label", name: "White-label", edition: "White-label", kind: "self-hosted", price: 49, price_label: "$49", support_hours: 0.25,
    serves: "a signed build and an offline licence file (no running service), a private issue tracker" },
  { key: "enterprise", name: "Enterprise", edition: "Enterprise", kind: "self-hosted", price: 799, price_label: "$799+", support_hours: 4,
    serves: "White-label plus support with a response time; high-availability Core runs on their infrastructure" },
  { key: "cloud-free", name: "Free", edition: "Cloud", kind: "cloud", price: 0, included: 10_000, per1k: null, cohorts: 0, support_hours: 0,
    acquisition: "Free is not priced to cover cost: it is what a free site costs us, paid as acquisition. Paused at the cap, so it cannot grow past it." },
  { key: "cloud-starter", name: "Starter", edition: "Cloud", kind: "cloud", price: 49, included: 100_000, per1k: 0.3, cohorts: 5, support_hours: 0.1 },
  { key: "cloud-growth", name: "Growth", edition: "Cloud", kind: "cloud", price: 249, included: 1_000_000, per1k: 0.2, cohorts: 20, support_hours: 0.25 },
  { key: "cloud-scale", name: "Scale", edition: "Cloud", kind: "cloud", price: 999, included: 10_000_000, per1k: 0.1, cohorts: 50, support_hours: 1 },
];

const cardFee = (price) => (price > 0 ? price * p("card_fee_rate") + p("card_fee_fixed") : 0);

// Infrastructure for one site with `sessions` protected sessions a month, watching `cohorts`
// abnormal cohorts. `allowances` applies Cloudflare's included amounts (a self-hosted account).
export function infrastructure({ sessions, cohorts, allowances }) {
  const instances = Math.max(1, Math.ceil(sessions / a("sessions_per_instance")));
  const syncs = (instances * MONTH_SECONDS) / a("sync_seconds");
  const escalations = sessions * a("escalation_share");
  const windows = MONTH_MINUTES / a("model_window_minutes");
  const modelCalls = windows * (1 + cohorts);
  const workerRequests = syncs + escalations + windows + MONTH_HOURS; // + model cron + hourly compaction
  const over = (used, included) => Math.max(0, used - (allowances ? included : 0));
  const lines = {
    platform_minimum: allowances || a("allocate_platform_minimum_per_plan") ? p("workers_paid_month") : 0,
    worker_requests: (over(workerRequests, p("workers_included_requests")) / 1e6) * p("workers_per_m_requests"),
    worker_cpu: (over(workerRequests * a("cpu_ms_per_core_call"), p("workers_included_cpu_ms")) / 1e6) * p("workers_per_m_cpu_ms"),
    shard_requests: ((syncs + escalations) / 1e6) * p("do_per_m_requests"),
    // A sync every 10 seconds keeps the site's shard awake all month.
    shard_duration: (over(MONTH_SECONDS * p("do_gb_per_object"), p("do_included_gbs")) / 1e6) * p("do_per_m_gbs"),
    shard_rows: (over(syncs * a("rows_written_per_sync") + sessions * a("rows_written_per_session"), p("do_included_rows_written")) / 1e6) * p("do_per_m_rows_written"),
    lake_writes: (over(a("lake_tables") * (MONTH_MINUTES + MONTH_HOURS), p("r2_included_class_a")) / 1e6) * p("r2_per_m_class_a"),
    lake_storage: ((sessions * a("lake_kb_per_session_month") * a("lake_retention_months")) / 1e6) * p("r2_per_gb_month"),
    decision_model: ((modelCalls * a("model_tokens_per_call")) / 1e6) * p("model_per_m_input_tokens"),
  };
  return { instances, lines, total: Object.values(lines).reduce((s, x) => s + x, 0) };
}

export function costToServe(tier) {
  const lines = { card_fees: cardFee(tier.price), support: tier.support_hours * p("support_hour") };
  if (tier.kind === "cloud") Object.assign(lines, infrastructure({ sessions: tier.included, cohorts: tier.cohorts, allowances: false }).lines);
  const total = Object.values(lines).reduce((s, x) => s + x, 0);
  return { lines, total };
}

// What 1,000 more sessions above the included amount cost us (card fee on the overage included).
export function marginalPer1k(tier) {
  if (tier.per1k == null) return null;
  const step = 1_000_000;
  const at = (n) => infrastructure({ sessions: n, cohorts: tier.cohorts, allowances: false }).total;
  return ((at(tier.included + step) - at(tier.included)) / step) * 1000 + tier.per1k * p("card_fee_rate");
}

// The site's self-hosting estimate (/own/#selfhost): 100 million requests a month on the person's
// own Cloudflare account, with its included allowances.
export function selfHostReference() {
  const sessions = a("sessions_per_100m_requests");
  const base = infrastructure({ sessions, cohorts: 0, allowances: true });
  const worst = infrastructure({ sessions, cohorts: a("max_cohorts"), allowances: true });
  const core = base.total - base.lines.decision_model - base.lines.lake_writes - base.lines.lake_storage;
  return {
    requests_per_month: 100_000_000,
    sessions,
    instances: base.instances,
    core: round2(core),
    decision_log: round2(base.lines.lake_writes + base.lines.lake_storage),
    decision_model_site_level: round2(base.lines.decision_model),
    decision_model_all_cohorts: round2(worst.lines.decision_model),
  };
}

// The greenhouse.yaml cost_model: block. A strict YAML subset (scalars, block maps and lists).
export function costModelYaml() {
  const q = (s) => JSON.stringify(String(s));
  const out = [];
  out.push("# Cost model (pricing gate): every tier on /own/ with its price and what it costs us to serve,");
  out.push("# per month in USD. Generated from costs/model.mjs by `npm run cost-model`; the tests fail when");
  out.push("# this block, the site's prices or the workings drift apart. All prices are proposals.");
  out.push("cost_model:");
  out.push("  currency: USD");
  out.push("  period: month");
  out.push(`  workings: ${q("costs/model.mjs")}`);
  out.push(`  pricing_page: ${q("/own/#editions")}`);
  out.push("  tiers:");
  for (const t of TIERS) {
    const c = costToServe(t);
    out.push(`    - name: ${q(t.name)}`);
    out.push(`      edition: ${q(t.edition)}`);
    out.push(`      kind: ${t.kind}`);
    out.push(`      price: ${t.price}`);
    if (t.price_label && t.price_label.endsWith("+")) out.push("      price_is_floor: true");
    if (t.kind === "cloud") {
      out.push(`      included_sessions: ${t.included}`);
      out.push(`      overage_per_1000: ${t.per1k == null ? "null" : t.per1k}`);
      const m = marginalPer1k(t);
      out.push(`      overage_cost_per_1000: ${m == null ? "null" : round2(m * 1000) / 1000}`);
      out.push(`      cohorts_watched: ${t.cohorts}`);
    }
    out.push(`      cost_to_serve: ${round2(c.total)}`);
    out.push(`      margin: ${round2(t.price - c.total)}`);
    out.push(`      below_cost: ${t.price < c.total}`);
    if (t.acquisition) out.push(`      below_cost_reason: ${q(t.acquisition)}`);
    out.push("      cost_lines:");
    for (const [k, v] of Object.entries(c.lines)) out.push(`        ${k}: ${round2(v)}`);
    if (t.serves) out.push(`      serves: ${q(t.serves)}`);
  }
  const sh = selfHostReference();
  out.push("  self_hosting:");
  out.push(`    path: ${q("/build/")}`);
  out.push(`    costs_page: ${q("/own/#selfhost")}`);
  out.push("    price: 0");
  out.push("    cost_to_us: 0");
  out.push(`    paid_by: ${q("the person running it, on their own Cloudflare account or one container")}`);
  out.push("    reference_month:");
  for (const [k, v] of Object.entries(sh)) out.push(`      ${k}: ${v}`);
  out.push("  sources:");
  for (const [id, s] of Object.entries(SOURCES)) {
    out.push(`    - id: ${q(id)}`);
    if (s.claim) out.push(`      claim: ${q(s.claim)}`);
    else {
      out.push(`      source_url: ${q(s.source_url)}`);
      out.push(`      quote: ${q(s.quote)}`);
      out.push(`      checked: ${q(s.checked)}`);
    }
  }
  out.push("  assumptions:");
  for (const [k, v] of Object.entries(ASSUMPTIONS)) out.push(`    ${k}: { value: ${v.value}, basis: ${q(v.basis)} }`);
  return out.join("\n") + "\n";
}

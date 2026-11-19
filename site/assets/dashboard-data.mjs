// Console preview: sample data and the views that render it.
// Everything here is sample data, generated from a fixed seed per site, so the page reads the
// same on every load and in the HTML written for readers without JavaScript (fillStatic below).
// Field names and shapes follow spec/openapi.yaml: Decision, StateV1, Directive, AnswerV1,
// PolicyVersion and SimulationResult, and the policy file in /docs/policy/.
// Nothing here talks to a network or stores anything.

/* ---------- Seeded numbers ---------- */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const REF_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const pick = (r, list) => list[Math.floor(r() * list.length)];
const hex = (r, n) => Array.from({ length: n }, () => "0123456789abcdef"[Math.floor(r() * 16)]).join("");
const refOf = (r) => "BR-" + Array.from({ length: 6 }, () => REF_CHARS[Math.floor(r() * 36)]).join("");
const ulid = (r) => Array.from({ length: 10 }, () => "0123456789ABCDEFGHJKMNPQRSTVWXYZ"[Math.floor(r() * 32)]).join("");

/* ---------- Formatting (fixed, locale-independent) ---------- */
export const fmt = (n) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
export const compact = (n) => n >= 1e6 ? `${(n / 1e6).toFixed(n >= 1e7 ? 0 : 1)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(n >= 1e4 ? 0 : 1)}k` : `${Math.round(n)}`;
export const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
const pad = (n) => String(n).padStart(2, "0");
const hhmm = (ms) => { const d = new Date(ms); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`; };
const hhmmss = (ms) => { const d = new Date(ms); return `${hhmm(ms)}:${pad(d.getUTCSeconds())}`; };
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const day = (ms) => { const d = new Date(ms); return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`; };
const iso = (ms) => new Date(ms).toISOString().replace(".000Z", "Z");
export const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/* ---------- The sample window and policy ---------- */
export const WINDOW_END = Date.UTC(2026, 10, 18, 10, 0, 0);
const HOUR = 3_600_000;
export const WINDOW_START = WINDOW_END - 24 * HOUR;
export const WINDOW_LABEL = `${day(WINDOW_START)} ${hhmm(WINDOW_START)} to ${day(WINDOW_END)} ${hhmm(WINDOW_END)} UTC`;

// The example policy from /docs/policy/ (version 12). Costs are units per request.
export const PATH_CLASSES = [
  { name: "static", cost: 0 }, { name: "general", cost: 1 }, { name: "search", cost: 5 },
  { name: "login", cost: 10 }, { name: "checkout", cost: 20 },
];
const SPEND_CLASSES = ["general", "search", "login", "checkout"];
const PATHS = {
  static: ["/favicon.ico", "/img/hero.webp"], general: ["/", "/products/oak-desk", "/products/linen-sheets", "/about", "/articles/2026/11/winter-guide"],
  search: ["/api/search", "/api/search/suggest"], login: ["/login", "/api/session"], checkout: ["/api/checkout", "/api/checkout/quote"],
};

export const POLICY_YAML = `version: 12
path_classes:
  - { name: static, match: ["/assets/*", "*.css", "*.js", "*.png"], cost: 0, min_tier: 0 }
  - { name: general, match: ["/*"], cost: 1, min_tier: 0 }
  - { name: search, match: ["/api/search*"], cost: 5, min_tier: 1 }
  - { name: login, match: ["POST /login", "POST /api/session"], cost: 10, min_tier: 1 }
  - { name: checkout, match: ["/api/checkout*"], cost: 20, min_tier: 1 }
budget: { refill_per_min: 20, burst: 300, provisional: 30, grants: { pow: 300, human: 3000, step_up: 6000 }, grant_decay: 0.5, identified_multiplier: 3, account_ceiling_per_hour: 20000, max_concurrent: 6 }
mint: { ip: 20, prefix: 60, asn: baseline_x5, ja4: baseline_x5 }
risk_score:
  - { when: "session.debt_ratio >= 1", add: 2 }
  - { when: "signals.automation_flag", add: 4 }
  - { when: "signals.no_input_after_30_requests", add: 2 }
  - { when: "signals.pow_ms_implausible", add: 1 }
  - { when: "net.mint_pressure", add: 2 }
  - { when: "session.network_changes_1h >= 5", add: 2 }
rules:
  - { id: verified-bots, when: "net.verified_bot in ['search_engine', 'monitoring']", then: allow }
  - { id: not-a-browser, when: "!ua.is_browser || ua.browser_age_years > 3", then: block }
  - { id: risk-5, when: "risk.score >= 5", then: "challenge(human)" }
  - { id: ai-escalation, when: "ai.attack >= 0.9 && ai.confidence >= 0.7 && request.path_class in ['search', 'login']", then: "challenge(human)", mode: log }
  - { id: over-budget, when: "session.credits < request.cost", then: "challenge(next_tier) || throttle" }
  - { id: default, when: "true", then: allow }`;

/* ---------- Sites ---------- */
// Three sample sites, each with its own seed and the kind of automation it sees.
export const SITES = [
  { id: "site_shop", domain: "shop.example.com", seed: 1201, base: 180_000, attack: { kind: "content_scraping", path_class: "search", network_class: "hosting", from: 1, to: 7, x: 4.6 } },
  { id: "site_tickets", domain: "tickets.example.org", seed: 4417, base: 64_000, attack: { kind: "credential_stuffing", path_class: "login", network_class: "hosting", from: 13, to: 18, x: 9.5 } },
  { id: "site_news", domain: "news.example.net", seed: 9083, base: 320_000, attack: { kind: "content_scraping", path_class: "general", network_class: "hosting", from: 5, to: 12, x: 1.9 } },
];

const MIX = { static: 0.30, general: 0.55, search: 0.11, login: 0.025, checkout: 0.015 };

/* ---------- Generation ---------- */
const cache = new Map();
export function siteData(siteId = SITES[0].id) {
  if (cache.has(siteId)) return cache.get(siteId);
  const site = SITES.find((s) => s.id === siteId) || SITES[0];
  const r = rng(site.seed);
  const a = site.attack;

  // Hourly requests and spend per path class over the 24 hours.
  const hours = [];
  for (let i = 0; i < 24; i++) {
    const t = WINDOW_START + i * HOUR;
    const h = new Date(t).getUTCHours();
    const diurnal = 0.55 + 0.45 * Math.sin(((h - 9) / 24) * 2 * Math.PI);
    const noise = 0.9 + r() * 0.2;
    const attacking = i >= a.from && i < a.to;
    const req = {}, spend = {};
    let total = 0;
    for (const pc of PATH_CLASSES) {
      let n = site.base * MIX[pc.name] * diurnal * noise;
      if (attacking && pc.name === a.path_class) n *= a.x * (0.85 + r() * 0.3);
      n = Math.round(n);
      req[pc.name] = n;
      spend[pc.name] = n * pc.cost;
      total += n;
    }
    hours.push({ t, i, requests: total, req, spend, attacking, sessions: Math.round(total / (attacking ? 26 : 38)) });
  }
  const sum = (f) => hours.reduce((s, x) => s + f(x), 0);
  const requests = sum((x) => x.requests);
  const attackRequests = sum((x) => (x.attacking ? x.req[a.path_class] * (1 - 1 / a.x) : 0));
  const sessionsActive = Math.round(sum((x) => x.sessions) * 0.62);
  const sessionsNew = Math.round(sessionsActive * (0.41 + r() * 0.06));
  const botSessions = Math.round(attackRequests / 160);

  // Challenges by tier. Tier 0 is the provisional allowance every new session starts with.
  const provisional = sessionsNew;
  const powIssued = Math.round(sessionsNew * 0.34 + botSessions * 0.9);
  const powPassed = Math.round(powIssued * (0.962 + r() * 0.02));
  const humanIssued = Math.round(botSessions * 0.38 + sessionsActive * 0.004);
  const humanPassed = Math.round(sessionsActive * 0.004 * 0.93 + botSessions * 0.38 * 0.07);
  const throttled = Math.round(botSessions * 0.31);
  const blocked = Math.round(botSessions * 0.22 + sessionsNew * 0.006);

  // Risk signals from the browser SDK (sessions in which each was seen).
  const signals = [
    { key: "automation_flag", label: "Automation flag", sub: "The browser reported it is driven by automation", n: Math.round(botSessions * 0.18 + sessionsActive * 0.0011), add: 4 },
    { key: "no_input_after_30_requests", label: "No input after 30 requests", sub: "30 requests in, no pointer, touch or key events", n: Math.round(botSessions * 0.71 + sessionsActive * 0.0042), add: 2 },
    { key: "pow_ms_implausible", label: "Implausible proof-of-work timing", sub: "Solved faster than the device class allows", n: Math.round(botSessions * 0.26 + sessionsActive * 0.0006), add: 1 },
  ];
  for (const s of signals) s.share = s.n / sessionsActive;

  // Cohorts the five-minute loop watched, with the model's shadow answer for each.
  const cohortDefs = [
    { network_class: a.network_class, session_age: "under_10m", path_class: a.path_class, x: a.x * 0.92, hot: true },
    { network_class: "hosting", session_age: "under_10m", path_class: a.path_class === "login" ? "search" : "login", x: 1.7 + r() * 0.6 },
    { network_class: "consumer_broadband", session_age: "over_1h", path_class: "checkout", x: 1.1 + r() * 0.2 },
    { network_class: "mobile", session_age: "10m_to_1h", path_class: "general", x: 0.94 + r() * 0.12 },
    { network_class: "consumer_broadband", session_age: "under_10m", path_class: "search", x: 1.02 + r() * 0.15 },
  ];
  const intentFor = (c) => c.hot ? a.kind : c.x > 1.5 ? "resource_exhaustion" : "normal";
  const cohorts = cohortDefs.map((c, k) => {
    const cost = PATH_CLASSES.find((p) => p.name === c.path_class).cost || 1;
    const base = Math.round(site.base * 24 * MIX[c.path_class] * (0.05 + r() * 0.08));
    const reqs = Math.round(base * c.x);
    const intent = intentFor(c);
    const attack = c.hot ? 0.9 + r() * 0.08 : intent === "normal" ? 0.02 + r() * 0.06 : 0.4 + r() * 0.3;
    return {
      cohort: { network_class: c.network_class, session_age: c.session_age, path_class: c.path_class },
      requests: reqs, requests_baseline: base, cost_spent: reqs * cost, cost_baseline: base * cost,
      sessions_over_budget: Math.round(c.hot ? botSessions * 0.4 : reqs * 0.0004 * (1 + k)),
      answer: { answer_id: `a_01JD${ulid(r)}`, intent, attack: +attack.toFixed(2), action: c.hot ? "human_check" : intent === "normal" ? "none" : "raise_pow", confidence: +(c.hot ? 0.72 + r() * 0.2 : 0.5 + r() * 0.3).toFixed(2) },
    };
  }).sort((x, y) => y.cost_spent / y.cost_baseline - x.cost_spent / x.cost_baseline);

  // Decision records (non-allow decisions), newest first.
  const decisions = [];
  const RULES = [
    { rule_id: "over-budget", w: 0.42 }, { rule_id: "risk-5", w: 0.2 }, { rule_id: "not-a-browser", w: 0.16 },
    { rule_id: "ai-escalation", w: 0.12 }, { rule_id: "over-budget-throttle", w: 0.1 },
  ];
  let t = WINDOW_END - 40_000;
  for (let k = 0; k < 28; k++) {
    t -= Math.round(60_000 + r() * 2_400_000);
    let x = r(), rule = RULES[0];
    for (const R of RULES) { if ((x -= R.w) <= 0) { rule = R; break; } }
    const hot = r() < 0.7;
    const path_class = hot ? a.path_class : pick(r, ["general", "search", "login", "checkout"]);
    const cost = PATH_CLASSES.find((p) => p.name === path_class).cost;
    const parts = [];
    if (rule.rule_id !== "not-a-browser") {
      if (r() < 0.75) parts.push({ when: "signals.no_input_after_30_requests", add: 2 });
      if (r() < 0.35 || rule.rule_id === "risk-5") parts.push({ when: "signals.automation_flag", add: 4 });
      if (r() < 0.4) parts.push({ when: "signals.pow_ms_implausible", add: 1 });
      if (r() < 0.5) parts.push({ when: "net.mint_pressure", add: 2 });
    }
    const risk = Math.min(10, parts.reduce((s, p) => s + p.add, 0));
    const base = { ts: iso(t), t, ref: refOf(r), sid_hash: hex(r, 12), uid_hash: path_class === "login" && r() < 0.3 ? hex(r, 12) : null, policy_version: t < WINDOW_START + 3 * HOUR ? 11 : 12, risk_score: risk, risk_parts: parts, cost, path_class, path: pick(r, PATHS[path_class]), ai_answer_id: null, directive_id: null };
    let rec;
    switch (rule.rule_id) {
      case "over-budget": rec = { ...base, action: "challenge", tier: risk >= 2 || r() < 0.4 ? "human" : "pow", rule_id: "over-budget", credits: Math.floor(r() * cost), outcome: pick(r, ["failed", "abandoned", "abandoned", "passed"]) }; break;
      case "over-budget-throttle": rec = { ...base, action: "throttle", tier: null, rule_id: "over-budget", credits: Math.floor(r() * cost), outcome: "served" }; break;
      case "risk-5": rec = { ...base, risk_score: Math.max(5, risk), action: "challenge", tier: "human", rule_id: "risk-5", credits: Math.round(40 + r() * 200), outcome: pick(r, ["failed", "abandoned", "pending"]) }; break;
      case "not-a-browser": rec = { ...base, action: "block", tier: null, rule_id: "not-a-browser", credits: 30, risk_parts: [], risk_score: 0, outcome: "served" }; break;
      default: rec = { ...base, action: "log", tier: "human", rule_id: "ai-escalation", credits: Math.round(60 + r() * 240), outcome: "served", ai_answer_id: cohorts[0].answer.answer_id, directive_id: `d_01JD${ulid(r)}` };
    }
    rec.ua = rec.rule_id === "not-a-browser" ? pick(r, ["python-requests/2.32", "Go-http-client/2.0", "Chrome 96 (3 years old)", "curl/8.7"]) : pick(r, ["Chrome 131", "Chrome 130", "Firefox 132", "Safari 18"]);
    rec.network_class = hot ? a.network_class : pick(r, ["consumer_broadband", "mobile", "hosting"]);
    rec.timeline = Array.from({ length: 5 }, (_, m) => {
      const minute = t - (4 - m) * 60_000;
      const reqs = Math.round(8 + r() * (hot ? 50 : 14));
      return { minute: hhmm(minute), requests: reqs, spend: reqs * Math.max(1, cost) };
    });
    decisions.push(rec);
  }

  // Policy versions and a simulation of a stricter draft.
  const versions = [
    { version: 12, parent_version: 11, published_at: iso(WINDOW_START + 3 * HOUR - 1_380_000), published_by: "ana (sample)", approved_by: "ravi (sample)", comment: "Stage ai-escalation as a dry run (mode: log) on search and login", checksum: `sha256:${hex(r, 8)}` },
    { version: 11, parent_version: 10, published_at: iso(WINDOW_START - 5 * 24 * HOUR + 7 * HOUR), published_by: "ravi (sample)", approved_by: "ana (sample)", comment: "Search costs 5 units and needs tier 1", checksum: `sha256:${hex(r, 8)}` },
    { version: 10, parent_version: 9, published_at: iso(WINDOW_START - 12 * 24 * HOUR + 2 * HOUR), published_by: "ana (sample)", approved_by: "jo (sample)", comment: "Add the checkout path class at 20 units", checksum: `sha256:${hex(r, 8)}` },
    { version: 9, parent_version: 8, published_at: iso(WINDOW_START - 26 * 24 * HOUR), published_by: "jo (sample)", approved_by: "ravi (sample)", comment: "Block browsers more than 3 years old", checksum: `sha256:${hex(r, 8)}` },
  ];
  const evaluated = sessionsActive;
  const chCur = (powIssued + humanIssued) / evaluated / 2.4;
  const simulation = {
    draft: "risk-5 at risk.score >= 4",
    window: { from: iso(WINDOW_START), to: iso(WINDOW_END) },
    current_version: 12, sessions_evaluated: evaluated, requests_evaluated: requests,
    challenged_share_current: +chCur.toFixed(4), challenged_share_draft: +(chCur * 1.21).toFixed(4),
    blocked_share_current: +(blocked / evaluated).toFixed(4), blocked_share_draft: +(blocked / evaluated).toFixed(4),
    throttled_share_current: +(throttled / evaluated).toFixed(4), throttled_share_draft: +(throttled / evaluated * 0.88).toFixed(4),
    signed_in_affected: 3 + Math.floor(r() * 9),
    rule_matches: [
      { rule_id: "not-a-browser", current: blocked, draft: blocked },
      { rule_id: "risk-5", current: Math.round(humanIssued * 0.31), draft: Math.round(humanIssued * 0.31 * 1.9) },
      { rule_id: "ai-escalation", current: Math.round(botSessions * 0.2), draft: Math.round(botSessions * 0.2) },
      { rule_id: "over-budget", current: powIssued, draft: Math.round(powIssued * 0.93) },
    ],
  };

  // Instances of the Node SDK reporting to Core.
  const instances = Array.from({ length: 3 }, (_, k) => ({ id: `inst_${hex(r, 6)}`, framework: ["Express", "Express", "Next.js"][k], last_sync: hhmmss(WINDOW_END - 4_000 - k * 9_000), policy_version: 12 }));

  const data = {
    site, hours, requests, sessionsActive, sessionsNew, botSessions,
    tiers: { provisional, powIssued, powPassed, humanIssued, humanPassed, throttled, blocked },
    signals, cohorts, decisions, versions, simulation, instances,
    spendTotal: sum((x) => SPEND_CLASSES.reduce((s, c) => s + x.spend[c], 0)),
  };
  data.agent = agentThread(data, r);
  cache.set(siteId, data);
  return data;
}

/* ---------- The agent's answers (sample) ---------- */
// The agent uses fixed, named tools (explain_decision, session_timeline, replay, metric) and
// attaches the query, row count, window, policy version and answer id to every answer.
function explain(d) {
  const r = d.rule_id;
  const parts = d.risk_parts.map((p) => `${p.when} (+${p.add})`).join(", ");
  let text;
  if (r === "not-a-browser") text = `The request came from ${d.ua}, which the bundled release table does not treat as a current browser, so the first matching rule was not-a-browser and it was blocked before any budget was charged.`;
  else if (r === "risk-5") text = `The session's risk score reached ${d.risk_score} from ${parts || "its scorecard"}. Rule risk-5 asks for a human check at 5 or more, so the request to ${d.path} was answered with a tier 2 challenge. The outcome was ${d.outcome}.`;
  else if (r === "ai-escalation") text = `Rule ai-escalation matched, but it runs with mode: log, so the decision was logged and the request was served. The model's shadow answer for this cohort was ${d.network_class} ${d.path_class}: likely automated. That answer was logged, not acted on.`;
  else if (d.action === "throttle") text = `The session had ${d.credits} credits and the request to ${d.path} costs ${d.cost}. No grant was left worth offering, so the fallback of over-budget applied: throttle, a 429 with Retry-After until the budget refills.`;
  else text = `The session had ${d.credits} credits and the request to ${d.path} (${d.path_class}) costs ${d.cost}, so over-budget matched and asked for the next tier: ${d.tier === "human" ? "a human check (tier 2)" : "an invisible proof-of-work (tier 1)"}.${parts ? ` Its scorecard showed ${parts}.` : ""} The outcome was ${d.outcome}.`;
  return text;
}

function agentThread(D, r) {
  const ans = () => `a_01JD${ulid(r)}`;
  const first = D.decisions.find((d) => d.rule_id === "over-budget" && d.action === "challenge") || D.decisions[0];
  const block = D.decisions.find((d) => d.rule_id === "not-a-browser") || D.decisions[1];
  const t = D.tiers;
  const topCohort = D.cohorts[0];
  const spendBy = SPEND_CLASSES.map((c) => ({ c, v: D.hours.reduce((s, h) => s + h.spend[c], 0) })).sort((x, y) => y.v - x.v);
  const peak = D.hours.reduce((m, h) => (h.requests > m.requests ? h : m), D.hours[0]);
  const win = WINDOW_LABEL;
  const items = [
    {
      q: `Why was ${first.ref} challenged?`,
      a: explain(first),
      tool: `explain_decision(ref: "${first.ref}")`,
      cols: ["minute", "requests", "spend", "rule"],
      rows: first.timeline.map((m, k) => [m.minute, fmt(m.requests), fmt(m.spend), k === 4 ? first.rule_id : "default"]),
      meta: { rows: 5, window: `${first.timeline[0].minute} to ${hhmm(first.t)} UTC`, policy_version: first.policy_version, answer_id: ans() },
    },
    {
      q: "What were the pass rates in the last 24 hours?",
      a: `Proof-of-work passed ${pct(t.powPassed / t.powIssued)} of ${fmt(t.powIssued)} issued. Human checks passed ${pct(t.humanPassed / t.humanIssued)} of ${fmt(t.humanIssued)}: most failures came from the ${topCohort.cohort.network_class} cohort on ${topCohort.cohort.path_class}, where sessions showed no input before the check.`,
      tool: `metric(name: "pass_rates", window: "24h")`,
      cols: ["tier", "issued", "passed", "rate"],
      rows: [["1 · pow", fmt(t.powIssued), fmt(t.powPassed), pct(t.powPassed / t.powIssued)], ["2 · human", fmt(t.humanIssued), fmt(t.humanPassed), pct(t.humanPassed / t.humanIssued)]],
      meta: { rows: 2, window: win, policy_version: 12, answer_id: ans() },
    },
    {
      q: "Did the model flag anything?",
      a: `Yes, one cohort: ${topCohort.cohort.network_class} sessions under 10 minutes old on ${topCohort.cohort.path_class}, ${(topCohort.requests / topCohort.requests_baseline).toFixed(1)} times their baseline. The model answered intent ${topCohort.answer.intent}, attack ${topCohort.answer.attack}, action ${topCohort.answer.action}. It runs in shadow mode: that answer was logged, not acted on. Rule ai-escalation would act on it and is staged with mode: log.`,
      tool: `metric(name: "shadow_answers", window: "24h")`,
      cols: ["cohort", "intent", "attack", "status"],
      rows: D.cohorts.slice(0, 3).map((c) => [`${c.cohort.network_class} · ${c.cohort.path_class}`, c.answer.intent, c.answer.attack.toFixed(2), "logged, not acted on"]),
      meta: { rows: 3, window: win, policy_version: 12, answer_id: ans() },
    },
  ];
  const more = [
    {
      q: "Where did the spend go?",
      a: `${spendBy[0].c} took ${pct(spendBy[0].v / D.spendTotal, 0)} of ${fmt(D.spendTotal)} units spent; ${spendBy[1].c} ${pct(spendBy[1].v / D.spendTotal, 0)}. The busiest hour started at ${hhmm(peak.t)} UTC with ${fmt(peak.requests)} requests. Static files cost 0 and are left out.`,
      tool: `metric(name: "spend_by_path_class", window: "24h")`,
      cols: ["path class", "units", "share"],
      rows: spendBy.map((s) => [s.c, fmt(s.v), pct(s.v / D.spendTotal)]),
      meta: { rows: 4, window: win, policy_version: 12, answer_id: ans() },
    },
    {
      q: `Explain ${block.ref}`,
      a: explain(block),
      tool: `explain_decision(ref: "${block.ref}")`,
      cols: ["field", "value"],
      rows: [["ua", block.ua], ["rule_id", block.rule_id], ["action", block.action], ["path", block.path]],
      meta: { rows: 4, window: `${hhmm(block.t)} UTC`, policy_version: block.policy_version, answer_id: ans() },
    },
    {
      q: `Replay ${first.sid_hash.slice(0, 6)}… against version 11`,
      a: `Under version 11 the same session would have spent the same units on ${first.path_class} and hit over-budget at the same minute: the rules that changed in version 12 (ai-escalation, a dry run) do not alter what it was asked.`,
      tool: `replay(sid_hash: "${first.sid_hash}", version: 11)`,
      cols: ["version", "decision", "tier"],
      rows: [["12", first.action, first.tier || "none"], ["11", first.action, first.tier || "none"]],
      meta: { rows: 2, window: `${first.timeline[0].minute} to ${hhmm(first.t)} UTC`, policy_version: 11, answer_id: ans() },
    },
  ];
  return { items, more };
}

/* ---------- SVG charts ---------- */
const BAR_COLORS = { general: "c-general", search: "c-search", login: "c-login", checkout: "c-checkout" };

export function spendChart(D) {
  const W = 760, H = 345, L = 52, R = 8, T = 14, B = 28;
  const iw = W - L - R, ih = H - T - B;
  const totals = D.hours.map((h) => SPEND_CLASSES.reduce((s, c) => s + h.spend[c], 0));
  const max = Math.max(...totals);
  const step = niceStep(max / 4);
  const top = Math.ceil(max / step) * step;
  const y = (v) => T + ih - (v / top) * ih;
  const bw = iw / 24;
  let g = "";
  for (let v = 0; v <= top; v += step) g += `<line class="grid" x1="${L}" x2="${W - R}" y1="${y(v).toFixed(1)}" y2="${y(v).toFixed(1)}"/><text class="tick" x="${L - 8}" y="${(y(v) + 4).toFixed(1)}" text-anchor="end">${compact(v)}</text>`;
  let bars = "";
  D.hours.forEach((h, i) => {
    let acc = 0;
    const x = L + i * bw + 3;
    const label = `${hhmm(h.t)} UTC: ${SPEND_CLASSES.map((c) => `${c} ${fmt(h.spend[c])}`).join(", ")}; total ${fmt(totals[i])} units`;
    bars += `<g class="bar${h.attacking ? " hot" : ""}" data-i="${i}" data-label="${esc(label)}"><title>${esc(label)}</title><rect class="hit" x="${(L + i * bw).toFixed(1)}" y="${T}" width="${bw.toFixed(1)}" height="${ih}"/>`;
    for (const c of SPEND_CLASSES) {
      const v = h.spend[c];
      if (!v) continue;
      const y1 = y(acc + v), y0 = y(acc);
      bars += `<rect class="${BAR_COLORS[c]}" x="${x.toFixed(1)}" y="${y1.toFixed(1)}" width="${(bw - 6).toFixed(1)}" height="${Math.max(0.5, y0 - y1).toFixed(1)}" rx="1.5"/>`;
      acc += v;
    }
    bars += "</g>";
    if (i % 3 === 0) bars += `<text class="tick" x="${(x + (bw - 6) / 2).toFixed(1)}" y="${H - 8}" text-anchor="middle">${hhmm(h.t)}</text>`;
  });
  const peak = totals.indexOf(max);
  const summary = `Stacked bars of spend by path class for each hour of the last 24 hours, sample data. Total ${fmt(D.spendTotal)} units; the peak hour starts at ${hhmm(D.hours[peak].t)} UTC with ${fmt(max)} units.`;
  return `<svg class="dchart" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(summary)}" preserveAspectRatio="xMidYMid meet">${g}${bars}</svg>`;
}

function niceStep(raw) {
  const p = 10 ** Math.floor(Math.log10(raw));
  const n = raw / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p;
}

export function spark(values, cls = "") {
  const W = 120, H = 34;
  const max = Math.max(...values), min = Math.min(...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - 3 - ((v - min) / (max - min || 1)) * (H - 6)]);
  const line = pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return `<svg class="spark ${cls}" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false" preserveAspectRatio="none"><polygon class="area" points="0,${H} ${line} ${W},${H}"/><polyline class="line" points="${line}"/></svg>`;
}

// A horizontal bar as SVG: width set by attribute, which the CSP allows (style attributes are not).
export function hbar(share, cls = "") {
  const w = Math.max(0.6, Math.min(100, share * 100));
  return `<svg class="hbar ${cls}" viewBox="0 0 100 8" preserveAspectRatio="none" aria-hidden="true" focusable="false"><rect class="track" width="100" height="8" rx="2"/><rect class="fill" width="${w.toFixed(2)}" height="8" rx="2"/></svg>`;
}

/* ---------- Views ---------- */
const badge = (action) => `<span class="pill a-${esc(action)}">${esc(action)}</span>`;
const tierName = (t) => (t === "pow" ? "1 · pow" : t === "human" ? "2 · human" : "none");
const cohortName = (c) => `${c.network_class} · ${c.session_age} · ${c.path_class}`;
const caption = (title, extra = "") => `<figcaption><span class="cap-t">${title}</span><span class="sample">Sample data</span>${extra}</figcaption>`;
const regionTable = (label, inner, cls = "") => `<div class="tablewrap${cls}" tabindex="0" role="region" aria-label="Table: ${esc(label)}">${inner}</div>`;

export function viewOverview(D) {
  const t = D.tiers;
  const reqSeries = D.hours.map((h) => h.requests);
  const sesSeries = D.hours.map((h) => h.sessions);
  const decided = t.powIssued + t.humanIssued + t.throttled + t.blocked;
  const kpis = [
    { k: "Sessions", v: fmt(D.sessionsActive), s: `${fmt(D.sessionsNew)} new`, sp: spark(sesSeries, "frost") },
    { k: "Requests", v: compact(D.requests), s: `${fmt(D.requests)} in 24 h`, sp: spark(reqSeries) },
    { k: "Challenges", v: fmt(t.powIssued + t.humanIssued), s: `${pct((t.powIssued + t.humanIssued) / D.sessionsActive)} of sessions`, sp: spark(D.hours.map((h) => h.req[D.site.attack.path_class]), "ember") },
    { k: "Throttled or blocked", v: fmt(t.throttled + t.blocked), s: `${pct((t.throttled + t.blocked) / decided)} of decisions`, sp: spark(D.hours.map((h) => (h.attacking ? 3 : 1) + (h.i % 5) / 10), "amber") },
  ];
  const legend = SPEND_CLASSES.map((c) => `<li><i class="${BAR_COLORS[c]}"></i>${c} <span class="mono">${PATH_CLASSES.find((p) => p.name === c).cost}u</span></li>`).join("");
  const tierRows = [
    { n: "0", name: "Provisional", sub: "Every new session starts here: 30 units, general paths only", issued: t.provisional, passed: null },
    { n: "1", name: "Proof-of-work", sub: "Invisible: the browser solves a puzzle in the background", issued: t.powIssued, passed: t.powPassed },
    { n: "2", name: "Human check", sub: "One accessible checkbox; the session's spend decides when", issued: t.humanIssued, passed: t.humanPassed },
  ];
  const tiers = tierRows.map((x) => `<li><span class="tier-n">${x.n}</span><div class="tier-b"><p class="tier-t">${x.name}</p><p class="tier-s">${x.sub}</p>${hbar(x.issued / t.provisional, x.n === "2" ? "ember" : x.n === "1" ? "amber" : "frost")}</div><p class="tier-v"><b>${fmt(x.issued)}</b><span>${x.passed === null ? "sessions" : `${pct(x.passed / x.issued)} passed`}</span></p></li>`).join("");
  const maxSig = Math.max(...D.signals.map((s) => s.n));
  const signals = D.signals.map((s) => `<li><div class="sig-h"><p class="sig-t">${s.label}</p><p class="sig-v"><b>${fmt(s.n)}</b> sessions</p></div><p class="sig-s">${s.sub} · <code>signals.${s.key}</code> +${s.add} risk</p>${hbar(s.n / maxSig, "ember")}</li>`).join("");
  const cohortRows = D.cohorts.map((c) => `<tr><th scope="row"><span class="co-1">${esc(c.cohort.network_class)}</span><span class="co-2">${esc(c.cohort.session_age)} · ${esc(c.cohort.path_class)}</span></th><td class="num">${fmt(c.requests)}</td><td class="num${c.requests / c.requests_baseline > 2 ? " hot" : ""}">×${(c.requests / c.requests_baseline).toFixed(1)}</td><td class="num">${fmt(c.cost_spent)}</td><td class="num">${fmt(c.sessions_over_budget)}</td><td><span class="model">${esc(c.answer.intent)} <span class="att">${c.answer.attack.toFixed(2)}</span></span><span class="shadow">logged, not acted on</span></td></tr>`).join("");
  return `
  <div class="kpis">${kpis.map((x) => `<div class="kpi"><p class="kpi-k">${x.k}</p><p class="kpi-v">${x.v}</p><p class="kpi-s">${x.s}</p>${x.sp}</div>`).join("")}</div>
  <div class="grid-2">
    <figure class="dcard span-2 chart-card">
      ${caption("Spend by path class, per hour", `<span class="readout" data-readout aria-hidden="true">Units charged. Point at an hour for its numbers.</span>`)}
      ${spendChart(D)}
      <ul class="legend" aria-label="Path classes and cost per request">${legend}<li class="legend-note">static costs 0 and is left out</li></ul>
    </figure>
    <figure class="dcard">
      ${caption("Challenges by tier")}
      <ol class="tiers">${tiers}</ol>
      <p class="card-foot">Tiers escalate on their own: when a session runs out of credit, <code>challenge(next_tier)</code> asks for the next one still worth passing. ${fmt(t.throttled)} sessions were throttled once no grant was left.</p>
    </figure>
    <figure class="dcard">
      ${caption("Risk signals seen")}
      <ul class="signals">${signals}</ul>
      <p class="card-foot">From the browser SDK, checked on the server. Event counts and timings only: no fingerprints, no keystroke content.</p>
    </figure>
    <figure class="dcard span-2">
      ${caption("Top cohorts by spend against baseline", `<span class="cap-x">The decision model runs in shadow mode</span>`)}
      ${regionTable("Top cohorts", `<table><thead><tr><th scope="col">Cohort</th><th scope="col" class="num">Requests</th><th scope="col" class="num">vs baseline</th><th scope="col" class="num">Units spent</th><th scope="col" class="num">Over budget</th><th scope="col">Model answer</th></tr></thead><tbody>${cohortRows}</tbody></table>`, " wide")}
    </figure>
  </div>`;
}

export function viewDecisions(D, selectedRef) {
  const sel = D.decisions.find((d) => d.ref === selectedRef) || D.decisions[0];
  const rows = D.decisions.map((d) => `<tr data-row="${d.ref}" data-text="${esc(`${d.ref} ${d.rule_id} ${d.action} ${d.path} ${d.path_class} ${d.tier || ""} ${d.sid_hash}`.toLowerCase())}"${d.ref === sel.ref ? ' class="on"' : ""}><th scope="row"><button type="button" class="ref" data-ref="${d.ref}" aria-pressed="${d.ref === sel.ref}">${d.ref}</button></th><td class="mono">${hhmm(d.t)}</td><td>${badge(d.action)}${d.tier ? `<span class="tier-tag">${d.tier}</span>` : ""}</td><td class="mono">${d.rule_id}</td><td class="mono path">${esc(d.path)}</td><td class="num">${d.risk_score}</td></tr>`).join("");
  return `
  <div class="dec-layout">
    <div class="dcard dec-list">
      <div class="toolbar" data-js-only hidden>
        <label class="search"><span class="visually-hidden">Search decisions by reference, rule, path or session</span><input type="search" data-search placeholder="Search BR-…, rule, path" autocomplete="off" spellcheck="false"></label>
        <label class="sel"><span>Action</span><select data-filter><option value="">All</option><option>challenge</option><option>throttle</option><option>block</option><option>log</option></select></label>
      </div>
      ${regionTable("Decision records", `<table class="dec-table"><caption class="visually-hidden">Non-allow decisions in the last 24 hours, newest first (sample data)</caption><thead><tr><th scope="col">Reference</th><th scope="col">Time UTC</th><th scope="col">Action · tier</th><th scope="col">Rule</th><th scope="col">Path</th><th scope="col" class="num">Risk</th></tr></thead><tbody>${rows}</tbody></table>`, " wide")}
      <p class="card-foot" data-count>${D.decisions.length} records · sample data · allow decisions are not listed</p>
    </div>
    <div class="dec-detail" data-detail aria-live="polite">${decisionDetail(sel)}</div>
  </div>`;
}

export function decisionDetail(d) {
  const fields = [
    ["ts", d.ts], ["ref", d.ref], ["sid_hash", d.sid_hash], ["uid_hash", d.uid_hash ?? "null"], ["action", d.action], ["tier", d.tier ?? "null"],
    ["rule_id", d.rule_id], ["policy_version", d.policy_version], ["risk_score", d.risk_score], ["credits", d.credits], ["cost", d.cost],
    ["path_class", d.path_class], ["path", d.path], ["outcome", d.outcome], ["ai_answer_id", d.ai_answer_id ?? "null"], ["directive_id", d.directive_id ?? "null"],
  ];
  const parts = d.risk_parts.length
    ? d.risk_parts.map((p) => `<tr><td class="mono">${esc(p.when)}</td><td class="num">+${p.add}</td></tr>`).join("")
    : `<tr><td class="mono">no scorecard lines matched</td><td class="num">0</td></tr>`;
  const tl = d.timeline.map((m) => `<tr><td class="mono">${m.minute}</td><td class="num">${fmt(m.requests)}</td><td class="num">${fmt(m.spend)}</td></tr>`).join("");
  return `
  <article class="dcard detail" aria-labelledby="detail-h">
    <div class="detail-h"><h3 id="detail-h"><span class="mono">${d.ref}</span></h3>${badge(d.action)}</div>
    <p class="detail-sub">${esc(d.path)} · ${hhmmss(d.t)} UTC · policy v${d.policy_version}</p>
    <div class="agent-box">
      <p class="who-agent"><span class="dot" aria-hidden="true"></span>Security agent · read-only</p>
      <p>${esc(explain(d))}</p>
      <p class="q-label">Query</p>
      <pre tabindex="0" role="region" aria-label="Code: query for ${d.ref}"><code>explain_decision(ref: "${d.ref}")</code></pre>
      <p class="q-label">Rows cited</p>
      <div class="mini-tables">
        ${regionTable(`risk scorecard for ${d.ref}`, `<table><thead><tr><th scope="col">risk_parts.when</th><th scope="col" class="num">add</th></tr></thead><tbody>${parts}</tbody></table>`)}
        ${regionTable(`session timeline for ${d.ref}`, `<table><thead><tr><th scope="col">minute</th><th scope="col" class="num">requests</th><th scope="col" class="num">spend</th></tr></thead><tbody>${tl}</tbody></table>`)}
      </div>
      ${d.ai_answer_id ? `<p class="shadow-note">Model answer <span class="mono">${d.ai_answer_id}</span>: logged, not acted on (shadow mode).</p>` : ""}
    </div>
    <details class="fields"><summary>Decision record fields</summary><dl>${fields.map(([k, v]) => `<div><dt class="mono">${k}</dt><dd class="mono">${esc(v)}</dd></div>`).join("")}</dl></details>
  </article>`;
}

export function viewPolicy(D) {
  const S = D.simulation;
  const cmp = (label, cur, dr) => `<tr><th scope="row">${label}</th><td class="num">${pct(cur, 2)}</td><td class="num${dr > cur ? " hot" : ""}">${pct(dr, 2)}</td></tr>`;
  return `
  <div class="pol-layout">
    <div class="dcard pol-file">
      <div class="file-h"><p class="mono">botrampart.policy.yaml</p><span class="pill a-ok">v12 · current</span><span class="pill ro">Read-only</span></div>
      <pre tabindex="0" role="region" aria-label="Code: policy file version 12"><code>${esc(POLICY_YAML)}</code></pre>
      <p class="card-foot">Editing in the console is coming next. Change the file in Git; Core type-checks it, compiles every condition and publishes it as a new version.</p>
    </div>
    <div class="pol-side">
      <section class="dcard" aria-labelledby="ver-h">
        <h3 id="ver-h" class="card-h">Version history</h3>
        <ol class="versions">${D.versions.map((v, k) => `<li${k === 0 ? ' class="cur"' : ""}><p class="v-n mono">v${v.version}</p><div><p class="v-c">${esc(v.comment)}</p><p class="v-m">${esc(v.published_at.slice(0, 16).replace("T", " "))} UTC · ${esc(v.published_by)}, approved by ${esc(v.approved_by)}</p></div></li>`).join("")}</ol>
        <p class="card-foot">Rolling back publishes an earlier version again.</p>
      </section>
      <section class="dcard" aria-labelledby="sim-h">
        <h3 id="sim-h" class="card-h">Simulation · ${esc(S.draft)}</h3>
        <p class="sim-sub">Replayed against the last 24 hours: ${fmt(S.sessions_evaluated)} sessions, ${compact(S.requests_evaluated)} requests. Sample data.</p>
        ${regionTable("Simulation shares", `<table><thead><tr><th scope="col">Share of sessions</th><th scope="col" class="num">v12</th><th scope="col" class="num">Draft</th></tr></thead><tbody>${cmp("Challenged", S.challenged_share_current, S.challenged_share_draft)}${cmp("Blocked", S.blocked_share_current, S.blocked_share_draft)}${cmp("Throttled", S.throttled_share_current, S.throttled_share_draft)}</tbody></table>`)}
        ${regionTable("Rule matches", `<table><thead><tr><th scope="col">rule_id</th><th scope="col" class="num">v12</th><th scope="col" class="num">Draft</th></tr></thead><tbody>${S.rule_matches.map((m) => `<tr><td class="mono">${m.rule_id}</td><td class="num">${fmt(m.current)}</td><td class="num">${fmt(m.draft)}</td></tr>`).join("")}</tbody></table>`)}
        <p class="sim-warn"><b>${S.signed_in_affected}</b> signed-in sessions would newly be challenged.</p>
      </section>
    </div>
  </div>`;
}

const agentItem = (x, k) => `
  <li class="msg q"><p class="who">You</p><p>${esc(x.q)}</p></li>
  <li class="msg a"><p class="who"><span class="dot" aria-hidden="true"></span>Security agent · read-only</p><p>${esc(x.a)}</p>
    <pre tabindex="0" role="region" aria-label="Code: agent query ${k + 1}"><code>${esc(x.tool)}</code></pre>
    ${regionTable(`rows for agent answer ${k + 1}`, `<table><thead><tr>${x.cols.map((c) => `<th scope="col">${esc(c)}</th>`).join("")}</tr></thead><tbody>${x.rows.map((r) => `<tr>${r.map((c) => `<td class="mono">${esc(c)}</td>`).join("")}</tr>`).join("")}</tbody></table>`)}
    <p class="meta mono">${x.meta.rows} rows · ${esc(x.meta.window)} · policy v${x.meta.policy_version} · ${x.meta.answer_id}</p>
  </li>`;

export function viewAgent(D, extra = 0) {
  const shown = D.agent.items.concat(D.agent.more.slice(0, extra));
  const left = D.agent.more.slice(extra);
  return `
  <div class="agent-layout">
    <div class="dcard thread-card">
      <ol class="thread" data-thread>${shown.map(agentItem).join("")}</ol>
      <div class="ask" data-js-only hidden>
        <p class="ask-l" id="ask-l">Ask a named question</p>
        <div class="chips" role="group" aria-labelledby="ask-l">${left.map((x, k) => `<button type="button" class="chip-q" data-more="${extra + k}">${esc(x.q)}</button>`).join("") || `<span class="fine">Every sample question is answered above.</span>`}</div>
      </div>
    </div>
    <aside class="dcard agent-side" aria-labelledby="ag-h">
      <h3 id="ag-h" class="card-h">What the agent can do</h3>
      <ul class="tools">
        <li><code>explain_decision</code><span>Rule, inputs, budget and model answer behind a reference, session or login ID</span></li>
        <li><code>session_timeline</code><span>Minute-by-minute spend, tiers and challenges for one session</span></li>
        <li><code>replay</code><span>Runs a policy version against a session's rollups</span></li>
        <li><code>metric</code><span>Named queries: top spenders, pass rates, spend by path class</span></li>
      </ul>
      <p class="card-foot">Read-only: a key scoped to your decision log, fixed queries, and the query and rows attached to every answer. It answers in Slack and here. Free-form SQL, suggested policy changes and email from the agent are coming next.</p>
    </aside>
  </div>`;
}

// Sample figures for the private preview, the same as the home page's benchmark grid: bot and
// automation tools across the top, bot-management vendors down the side, each cell the share of
// sessions caught. Every value is listed in MOCK_FIGURES.md at the repository root.
export const BENCH_TOOLS = [
  { tool: "Headless Chrome", sessions: "2,000" },
  { tool: "Selenium", sessions: "2,000" },
  { tool: "Playwright", sessions: "2,000" },
  { tool: "Puppeteer", sessions: "2,000" },
  { tool: "Puppeteer Stealth", sessions: "2,000" },
  { tool: "undetected-chromedriver", sessions: "2,000" },
  { tool: "AI browser agents", sessions: "500" },
];
export const BENCH_VENDORS = [
  { vendor: "BotRampart", caught: ["99.9", "99.8", "99.7", "99.8", "98.9", "98.6", "97.4"] },
  { vendor: "Cloudflare", caught: ["97.8", "96.9", "95.4", "96.1", "88.3", "84.7", "71.6"] },
  { vendor: "Akamai", caught: ["98.4", "97.6", "96.8", "97.2", "91.5", "89.2", "76.3"] },
  { vendor: "DataDome", caught: ["98.9", "98.2", "97.6", "97.9", "93.7", "91.4", "81.2"] },
  { vendor: "HUMAN", caught: ["98.1", "97.4", "96.5", "96.9", "90.8", "88.1", "78.4"] },
  { vendor: "Kasada", caught: ["99.2", "98.7", "98.1", "98.4", "95.2", "93.6", "83.5"] },
  { vendor: "Imperva", caught: ["96.7", "95.8", "94.2", "94.9", "86.4", "82.9", "68.9"] },
  { vendor: "F5 (Shape)", caught: ["98.6", "97.9", "97.0", "97.3", "92.1", "90.3", "74.8"] },
  { vendor: "Arkose Labs", caught: ["95.9", "95.1", "93.8", "94.6", "87.9", "85.5", "79.1"] },
];
// Heat band for a catch rate, so the grid reads at a glance without inline styles.
export function benchBand(v) {
  const n = Number(v);
  return n >= 98 ? "b5" : n >= 95 ? "b4" : n >= 90 ? "b3" : n >= 80 ? "b2" : "b1";
}
// The grid's table, shared by the console view and (pasted) the home page.
export function benchTable(caption) {
  const head = `<tr><th scope="col">Vendor</th>${BENCH_TOOLS.map((t) => `<th scope="col">${esc(t.tool)}</th>`).join("")}</tr>`;
  const body = BENCH_VENDORS.map((v, i) => `<tr${i === 0 ? ' class="us"' : ""}><th scope="row">${esc(v.vendor)}</th>${v.caught.map((c) => `<td class="num ${benchBand(c)}">${c}%</td>`).join("")}</tr>`).join("");
  const foot = `<tr class="n"><th scope="row">Sessions per vendor</th>${BENCH_TOOLS.map((t) => `<td class="num">${t.sessions}</td>`).join("")}</tr>`;
  return `<table class="bench-grid"><caption class="visually-hidden">${esc(caption)}</caption><thead>${head}</thead><tbody>${body}</tbody><tfoot>${foot}</tfoot></table>`;
}
export function viewBenchmark() {
  return `
  <div class="dcard bench">
    <div class="bench-h"><p class="pill sample-pill">Sample figures for the private preview</p><p>Popular bot and automation tools across the top, bot-management vendors down the side. Each cell is the share of that tool's sessions the vendor caught. BotRampart's false-positive rate on people browsing the same origin: 0.3% of 10,000 sessions.</p></div>
    ${regionTable("Detection benchmark", benchTable("Detection benchmark: share of sessions caught, by vendor and automation tool. Sample figures for the private preview."), " wide")}
  </div>`;
}

export function viewSettings(D) {
  const ok = (t) => `<span class="pill a-ok">${t}</span>`;
  const no = `<span class="pill next">Coming next</span>`;
  const inst = D.instances.map((i) => `<li><span class="mono">${i.id}</span><span>${i.framework}</span><span class="mono">synced ${i.last_sync} UTC · v${i.policy_version}</span></li>`).join("");
  return `
  <div class="set-grid">
    <section class="dcard" aria-labelledby="int-h">
      <h3 id="int-h" class="card-h">Integrations</h3>
      <ul class="integrations">
        <li class="on"><div><p class="int-t">Node SDK</p><p class="int-s">Express, Fastify and Next.js, in your app process</p></div>${ok("Connected · sample")}</li>
        <li class="on"><div><p class="int-t">Browser SDK</p><p class="int-s">Script tag <code>/_br/sdk.js</code>, signals mode standard</p></div>${ok("Connected · sample")}</li>
        <li><div><p class="int-t">nginx module</p><p class="int-s">Edge adapter</p></div>${no}</li>
        <li><div><p class="int-t">Cloudflare Worker</p><p class="int-s">Edge adapter in front of your origin</p></div>${no}</li>
        <li><div><p class="int-t">CloudFront and Lambda@Edge</p><p class="int-s">Edge adapter</p></div>${no}</li>
        <li><div><p class="int-t">Python, Go, Java and mobile SDKs</p><p class="int-s">SDKs other than Node</p></div>${no}</li>
      </ul>
    </section>
    <section class="dcard" aria-labelledby="inst-h">
      <h3 id="inst-h" class="card-h">Node SDK instances</h3>
      <ul class="instances">${inst}</ul>
      <p class="card-foot">Instances keep only their own counters and sync with Core every few seconds; the visitor metrics above are aggregated by Core, not the SDK.</p>
    </section>
    <section class="dcard" aria-labelledby="run-h">
      <h3 id="run-h" class="card-h">Where it runs</h3>
      <dl class="kv">
        <div><dt>Core</dt><dd>Cloudflare Workers · sample</dd></div>
        <div><dt>Decision log</dt><dd><span class="mono">s3://${esc(D.site.domain.split(".")[0])}-br-log/br/v1/</span> · your bucket</dd></div>
        <div><dt>Agent</dt><dd>Slack app in your workspace and this console · read-only</dd></div>
        <div><dt>Decision model</dt><dd>Shadow mode: answers are logged, not acted on</dd></div>
        <div><dt>Site</dt><dd class="mono">${esc(D.site.id)} · ${esc(D.site.domain)}</dd></div>
      </dl>
    </section>
  </div>`;
}

export const VIEWS = {
  overview: (D) => viewOverview(D),
  decisions: (D) => viewDecisions(D),
  policy: (D) => viewPolicy(D),
  agent: (D) => viewAgent(D),
  benchmark: () => viewBenchmark(),
  settings: (D) => viewSettings(D),
};

// Writes each view's first, static render into the page between <!-- dash:NAME --> and
// <!-- /dash:NAME -->, so the console reads without JavaScript. fillStatic(html) === html
// means the page is current.
export function fillStatic(html, siteId = SITES[0].id) {
  const D = siteData(siteId);
  return html.replace(/(<!-- dash:([a-z]+) -->)[\s\S]*?(<!-- \/dash:\2 -->)/g, (_, open, name, close) => {
    if (!VIEWS[name]) throw new Error(`unknown view ${name}`);
    return `${open}${VIEWS[name](D).replace(/\n\s*/g, "\n")}\n${close}`;
  });
}

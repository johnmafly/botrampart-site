// Run a session (signup). Client-side only: no network requests, no cookies, no storage of any kind.
// Step 4 simulates one hour of traffic shaped by the answers with the reference economics code,
// and times a real proof-of-work of the tier 1 shape on the visitor's device.
import { newSession, charge, pass } from "/assets/economics.mjs";

const form = document.querySelector("[data-flow]");
const steps = [...form.querySelectorAll("[data-step]")];
const progress = [...document.querySelectorAll("[data-progress] li")];
const out = (name) => form.querySelector(`[data-out="${name}"]`);
const fmt = (n) => Math.round(n).toLocaleString("en-US");
let current = 0;

function show(i) {
  current = i;
  steps.forEach((s, k) => { s.hidden = k !== i; });
  progress.forEach((p, k) => {
    p.className = k < i ? "done" : k === i ? "on" : "";
    if (k === i) p.setAttribute("aria-current", "step"); else p.removeAttribute("aria-current");
  });
  if (i === 2) renderInstall();
  if (i === 3) runFirstHour();
  steps[i].querySelector("h2").focus({ preventScroll: true });
  window.scrollTo({ top: document.querySelector(".flow").offsetTop - 80, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

form.addEventListener("click", (e) => {
  if (e.target.closest("[data-next]")) show(Math.min(current + 1, steps.length - 1));
  if (e.target.closest("[data-back]")) show(Math.max(current - 1, 0));
  if (e.target.closest("[data-restart]")) { form.reset(); show(0); }
});
form.addEventListener("submit", (e) => e.preventDefault());

const answers = () => {
  const d = new FormData(form);
  return {
    site: (d.get("site") || "").trim() || "your site",
    framework: d.get("framework"), integration: d.get("integration") || "sdk", volume: +d.get("volume"), abuse: d.getAll("abuse"),
    core: d.get("core"), lake: d.get("lake"), model: d.get("model"),
  };
};

// Integration points. Only the in-app Node SDK is available; the edge adapters can be picked and
// are marked coming next, and the session continues with the SDK.
const INTEGRATIONS = {
  sdk: { label: "Node backend SDK, in your app", available: true },
  nginx: { label: "nginx module", available: false },
  worker: { label: "Cloudflare Worker in your account", available: false },
  cloudfront: { label: "CloudFront (Lambda@Edge) in your account", available: false },
};

function renderInstall() {
  const a = answers();
  const integ = INTEGRATIONS[a.integration] ?? INTEGRATIONS.sdk;
  const fw = a.framework === "other" ? "Express" : a.framework;
  const coreLabel = { cloudflare: "Cloudflare Workers, your account", docker: "One container on a Linux host", kubernetes: "Kubernetes, plain manifests" }[a.core];
  const files = { cloudflare: "a Wrangler configuration", docker: "a compose file", kubernetes: "a Deployment and a Service" }[a.core];
  out("init").textContent = [
    `Integration      ${integ.available ? integ.label : `${integ.label}: coming next, using the Node backend SDK today`}`,
    `App framework    ${a.framework === "other" ? "an SDK for your framework is coming next, showing Express" : a.framework}`,
    `Core             ${coreLabel} (${files})`,
    `Decision log     ${a.lake} bucket, in your account`,
    `Decision loop    ${{ off: "off", gemini: "Gemini Decision 1, shadow mode", local: "self-hosted model, shadow mode" }[a.model]}`,
    `Secrets          br_keys, lake_writer (in your secret store)`,
  ].join("\n");
  const core = a.core === "cloudflare" ? "https://core.your-account.workers.dev" : "http://localhost:8787";
  const where = fw === "Next.js" ? "in front of every route the app serves" : "at the app's root, ahead of your routes";
  out("code").textContent = [
    `# mounted ${where}`,
    `site         "site_123"`,
    `secretsFile  "./secrets/br_keys"`,
    `core         "${core}"`,
    `mode         "observe"   # log, enforce nothing`,
    "",
    "# serves on your origin: GET /_br/sdk.js, GET /_br/challenge, POST /_br/redeem,",
    "#                        POST /_br/signals, GET /_br/status",
    "# sets on every response: BR-Sid, BR-Decision",
  ].join("\n");
  out("file").textContent = `Backend SDK settings · ${fw}`;
  const notes = [];
  if (!integ.available) notes.push(`The ${integ.label.replace(/ \(.*\)| in your account/g, "")} integration is coming next. This session continues with the Node backend SDK inside your app, which works today.`);
  if (a.framework === "other") notes.push("An SDK for your framework is coming next: the backend SDK covers Express, Fastify and Next.js. The rest of this session shows the Express setup.");
  out("other").textContent = notes.join(" ");
  out("other").hidden = notes.length === 0;
}

// Deterministic pseudo-random numbers, so the same answers give the same hour.
function rng(seed) { return () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296); }

function simulate(a) {
  const rand = rng(a.volume + a.abuse.length * 7919);
  const HOUR = 3600_000;
  const t0 = Date.UTC(2026, 10, 18, 10, 0, 0);
  const perHour = a.volume / 730;
  // Simulate a sample of up to 3,000 people's sessions and scale the people's figures up.
  const humanSessionsReal = perHour / 14;
  const humanSample = Math.min(3000, Math.max(200, Math.round(humanSessionsReal)));
  const scale = humanSessionsReal / humanSample;
  const spend = { general: 0, search: 0, login: 0, checkout: 0 };
  let humansChallenged = 0;
  let humanRequests = 0;
  const mix = [["general", 0.72], ["search", 0.2], ["login", 0.03], ["checkout", 0.05]];
  const pick = () => { let r = rand(); for (const [c, p] of mix) { if ((r -= p) < 0) return c; } return "general"; };

  for (let i = 0; i < humanSample; i++) {
    const power = rand() < 0.004; // a few very heavy people: researchers, bargain hunters
    const n = power ? 300 + Math.floor(rand() * 200) : 4 + Math.floor(rand() * 26);
    const start = t0 + rand() * HOUR * 0.8;
    const span = power ? HOUR * 0.25 : HOUR * 0.15;
    const s = newSession(start);
    pass(s, "pow", start);
    let challenged = false;
    for (let k = 0; k < n; k++) {
      const c = power ? (rand() < 0.7 ? "search" : "general") : pick();
      const r = charge(s, c, start + (span * k) / n);
      humanRequests += 1;
      if (r.action === "allow") spend[c] += r.cost;
      else if (r.action === "challenge") { challenged = true; pass(s, r.challenge, start + (span * k) / n); }
    }
    if (challenged) humansChallenged += 1;
  }
  for (const k in spend) spend[k] *= scale;

  // Automation, sized to the site. Each cohort runs through the same policy.
  const bots = [];
  const big = Math.max(1, Math.round(perHour / 40000));
  if (a.abuse.includes("scraping")) bots.push({ label: "search scraper, keeps its cookie, pays a solver", sessions: 4 * big, reqs: 4000, cls: "search", solver: true });
  if (a.abuse.includes("crawlers")) bots.push({ label: "crawler that runs no JavaScript", sessions: 30 * big, reqs: 400, cls: "general", nojs: true });
  if (a.abuse.includes("stuffing")) bots.push({ label: "credential stuffing", sessions: 6 * big, reqs: 600, cls: "login", solver: false });
  if (a.abuse.includes("signups")) bots.push({ label: "fake sign-ups", sessions: 10 * big, reqs: 80, cls: "login", solver: false });
  let refused = 0;
  let botRequests = 0;
  let example = null;
  for (const b of bots) {
    for (let i = 0; i < b.sessions; i++) {
      const start = t0 + rand() * HOUR * 0.3;
      const s = newSession(start);
      if (!b.nojs) pass(s, "pow", start);
      for (let k = 0; k < b.reqs; k++) {
        const t = start + (HOUR * 0.6 * k) / b.reqs;
        const r = charge(s, b.cls, t);
        botRequests += 1;
        if (r.action === "allow") { spend[b.cls] += r.cost; continue; }
        refused += 1;
        if (r.action === "challenge" && b.solver && r.challenge !== "pow") {
          if (!example && b.cls === "search") example = { t, credits: r.credits, spent: s.passes.human.length };
          pass(s, r.challenge, t);
        }
      }
    }
  }
  return { humansChallenged: humansChallenged * scale, humanSessions: humanSessionsReal, refused, botRequests, spend, example, bots, humanRequests: humanRequests * scale };
}

// A proof-of-work of the tier 1 shape: 16 small SHA-256 puzzles, each needing a hash
// with 10 leading zero bits. The final algorithm is still to be chosen (PBKDF2 or Argon2id).
async function proofOfWork() {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16)).join(".");
  const t = performance.now();
  for (let p = 0; p < 16; p++) {
    for (let n = 0; ; n++) {
      const h = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(`${salt}:${p}:${n}`)));
      if (h[0] === 0 && h[1] < 64) break;
    }
  }
  return performance.now() - t;
}

async function runFirstHour() {
  const a = answers();
  ["humans", "refused", "pow"].forEach((k) => { out(k).textContent = "…"; });
  out("intro").textContent = `A simulated hour of traffic for ${a.site}, shaped like ${fmt(a.volume / 1e6)} million requests a month, run through the default policy by the same code this site uses for its examples. Nothing was enforced; this is what BotRampart would have done.`;
  const r = simulate(a);
  const pct = (r.humansChallenged / r.humanSessions) * 100;
  out("humans").textContent = `${pct < 0.1 ? pct.toFixed(2) : pct.toFixed(1)}%`;
  out("refused").textContent = r.botRequests ? `${Math.round((r.refused / r.botRequests) * 100)}%` : "none";
  const total = Object.values(r.spend).reduce((x, y) => x + y, 0) || 1;
  out("bars").innerHTML = "";
  for (const [k, v] of Object.entries(r.spend).sort((x, y) => y[1] - x[1])) {
    const row = document.createElement("div");
    row.className = "spend-row";
    row.innerHTML = `<span>${k}</span><i class="${k === "general" ? "ok" : ""}"></i><span>${Math.round((v / total) * 100)}%</span>`;
    // Width set through the CSSOM, which the site's CSP allows (style attributes in markup it does not).
    row.querySelector("i").style.width = `${Math.max(1, (v / total) * 100)}%`;
    out("bars").append(row);
  }
  const chat = out("chat");
  if (r.example) {
    const when = new Date(r.example.t).toISOString().slice(11, 19);
    chat.innerHTML = `<div class="chat-msg"><div class="avatar" aria-hidden="true">You</div><div class="chat-body"><div class="chat-name">You</div><p>@BotRampart what is hammering search?</p></div></div>
      <div class="chat-msg"><div class="avatar bot" aria-hidden="true">BR</div><div class="chat-body"><div class="chat-name">BotRampart</div>
      <p>${(() => { const n = r.bots.find((b) => b.cls === "search").sessions; return n === 1 ? "One session" : `${fmt(n)} sessions`; })()} spent most of search's budget. Each kept its cookie and paid for human checks, so each pass bought half the credit of the one before. The first ran out at ${when} (reference BR-7F3K2Q, rule <code>over-budget</code>, policy v1). In observe mode nothing was refused; in enforce mode each would now be limited to the refill rate, about 4 searches a minute.</p>
      <p class="chat-cite">simulated · explain_decision · policy v1</p></div></div>`;
  } else {
    chat.innerHTML = `<div class="chat-msg"><div class="avatar bot" aria-hidden="true">BR</div><div class="chat-body"><div class="chat-name">BotRampart</div><p>Quiet hour: no session ran out of budget on a costly path. ${r.bots.length ? "Clients that run no JavaScript stayed at tier 0 and read general pages only." : ""} Nothing to change yet.</p><p class="chat-cite">simulated · daily digest · policy v1</p></div></div>`;
  }
  out("next").textContent = pct < 0.5
    ? "Switch to enforce mode with the default policy: under 1 in 200 people's sessions would have seen anything beyond the invisible check, inside the 1-in-200 threshold for enforcing."
    : "Raise the refill rate or lower the cost of search before enforcing: more people than the target would have seen a check.";
  out("pow").textContent = "solving…";
  try {
    const ms = await proofOfWork();
    out("pow").textContent = `${(ms / 1000).toFixed(2)} s`;
  } catch {
    out("pow").textContent = "not available";
  }
}

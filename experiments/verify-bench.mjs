// Experiment 1: what does the per-request path cost?
//
// Locked assumption tested: "Enforcement with SDKs only. Tokens are verified offline in the app
// server" and the first-build exit target "the backend SDK adds under 1 ms at the 99th
// percentile per request". This measures the cheapest honest version of that path in Node:
// parse the __br_s cookie, check its HMAC-SHA256 signature in constant time, check expiry, then
// charge the request against the session budget with the reference economics code.
// It measures our reference code on one machine, not a shipped SDK, and leaves out rule
// evaluation, the user-agent table and framework overhead.
//
// usage: node experiments/verify-bench.mjs > experiments/verify-bench.json
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cpus, platform, arch } from "node:os";
import { newSession, charge } from "../site/assets/economics.mjs";

const key = randomBytes(32);
const b64u = (buf) => Buffer.from(buf).toString("base64url");
const now = Math.floor(Date.now() / 1000);

function mint(sid) {
  const payload = b64u(JSON.stringify({
    v: 1, sid, iat: now, exp: now + 1800, ses: now + 604800, tier: 1, tx: {},
    bind: { ua: "chrome-131", net: "AS64512" }, kid: "s3",
  }));
  const sig = b64u(createHmac("sha256", key).update(`br1.${payload}`).digest());
  return `br1.${payload}.${sig}`;
}

function verify(cookie, nowSec) {
  const dot = cookie.lastIndexOf(".");
  const signed = cookie.slice(0, dot);
  const given = Buffer.from(cookie.slice(dot + 1), "base64url");
  const want = createHmac("sha256", key).update(signed).digest();
  if (given.length !== want.length || !timingSafeEqual(given, want)) return null;
  const p = JSON.parse(Buffer.from(signed.slice(4), "base64url").toString());
  return p.exp > nowSec && p.ses > nowSec ? p : null;
}

// 10,000 live sessions, requests spread over them, mixed path classes.
const SESSIONS = 10_000;
const cookies = Array.from({ length: SESSIONS }, () => mint(b64u(randomBytes(16))));
const budgets = new Map();
const classes = ["general", "general", "general", "search", "static", "general", "login"];

const N = 300_000;
const WARM = 30_000;
const samples = new Float64Array(N);
let allowed = 0;
let t = Date.now();
for (let i = 0; i < N + WARM; i++) {
  const cookie = cookies[i % SESSIONS];
  t += 1;
  const start = process.hrtime.bigint();
  const p = verify(cookie, now);
  let s = budgets.get(p.sid);
  if (!s) { s = newSession(t); s.tier = 1; s.credits = 300; budgets.set(p.sid, s); }
  const r = charge(s, classes[i % classes.length], t);
  const ns = Number(process.hrtime.bigint() - start);
  if (i >= WARM) { samples[i - WARM] = ns; if (r.action === "allow") allowed += 1; }
}

// A forged cookie must be rejected.
const forged = cookies[0].slice(0, -2) + (cookies[0].endsWith("A") ? "BB" : "AA");
if (verify(forged, now) !== null) throw new Error("forged cookie accepted");

samples.sort();
const q = (p) => samples[Math.min(N - 1, Math.floor(p * N))] / 1000;
const round = (x) => Math.round(x * 100) / 100;
console.log(JSON.stringify({
  experiment: "verify-and-charge",
  date: new Date().toISOString().slice(0, 10),
  machine: `${cpus()[0].model}, ${platform()} ${arch()}, one Node process`,
  node: process.version,
  requests_measured: N,
  sessions: SESSIONS,
  verify_p50_us: round(q(0.5)),
  verify_p90_us: round(q(0.9)),
  verify_p99_us: round(q(0.99)),
  verify_p999_us: round(q(0.999)),
  allowed_share: round(allowed / N),
  forged_cookie_rejected: true,
  target_p99_us: 1000,
}, null, 2));

// Home page motion. Everything here only adds to a page that is complete without it:
// the instrument, the stage and the chat are fully written into the HTML.
// With reduced motion, the instrument does not run and nothing transitions.
import { newSession, charge, pass, nextGrant } from "/assets/economics.mjs";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const fmt = (n) => Math.round(n).toLocaleString("en-US");

/* ---------- 1. The instrument: two sessions, one policy, run by the reference code. ---------- */
const sim = document.querySelector("[data-sim]");
if (sim && !reduce) {
  const TICK = 10_000; // simulated milliseconds per line
  const SPEED = 700; // real milliseconds per line
  const LINES = 6;
  const lane = (name) => {
    const el = sim.querySelector(`[data-lane="${name}"]`);
    return { tape: el.querySelector("[data-tape]"), cells: [...el.querySelectorAll("[data-meter] i")], bal: el.querySelector("[data-bal]"), verdict: el.querySelector("[data-verdict]") };
  };
  const person = lane("person");
  const script = lane("script");
  const clock = sim.querySelector("[data-clock]");
  const replay = sim.querySelector("[data-replay]");

  const line = (l, text, amount, cls) => {
    const li = document.createElement("li");
    li.className = "new";
    const a = document.createElement("span");
    a.textContent = text;
    const b = document.createElement("span");
    b.textContent = amount;
    b.className = cls;
    li.append(a, b);
    l.tape.prepend(li);
    while (l.tape.children.length > LINES) l.tape.lastElementChild.remove();
  };
  const meter = (l, credits, scale) => {
    const lit = Math.round(Math.max(0, Math.min(1, credits / scale)) * l.cells.length);
    l.cells.forEach((c, i) => {
      const was = c.classList.contains("on");
      const on = i < lit;
      c.classList.toggle("on", on);
      c.classList.toggle("burn", was && !on);
    });
    l.bal.textContent = fmt(credits);
  };

  const personPlan = [["general", "GET /products/42"], ["general", "GET /products/42/reviews"], null, ["search", "GET /api/search?q=boots"], ["general", "GET /products/77"], null, ["general", "GET /cart"], ["search", "GET /api/search?q=boots+wide"], null, ["general", "GET /products/77/sizes"]];
  let timer;

  function run() {
    clearInterval(timer);
    person.tape.textContent = "";
    script.tape.textContent = "";
    person.verdict.textContent = "Browsing…";
    script.verdict.textContent = "Searching…";
    let t = Date.UTC(2026, 10, 16, 10, 12, 0);
    const p = newSession(t);
    const s = newSession(t);
    let step = 0;
    let scale = 300;
    let throttled = false;
    let checks = 0;
    line(person, "GET /products (first visit)", "tier 0", "c");
    line(script, "GET /api/search (no cookie)", "tier 0", "c");
    meter(person, p.credits, 300);
    meter(script, s.credits, 300);

    timer = setInterval(() => {
      t += TICK;
      step += 1;
      clock.textContent = new Date(t).toISOString().slice(11, 19);

      if (step === 1) { pass(p, "pow", t); line(person, "proof-of-work, unseen", "+300", "g"); }
      else {
        const req = personPlan[step % personPlan.length];
        if (req) {
          const r = charge(p, req[0], t);
          line(person, req[1], `−${r.cost}`, "c");
        } else {
          const before = p.credits;
          charge(p, "static", t);
          const gained = p.credits - before;
          line(person, gained >= 0.5 ? "reading; credit refills" : "reading; balance full", gained >= 0.5 ? `+${fmt(gained)}` : "·", "g");
        }
      }
      meter(person, p.credits, 300);
      person.verdict.textContent = "No challenge after the invisible first one.";

      if (!throttled) {
        if (step === 1) {
          const r = charge(s, "search", t);
          line(script, `search needs tier 1: ${r.challenge}`, "403", "x");
          scale = pass(s, "pow", t);
          line(script, "proof-of-work solved", `+${fmt(scale)}`, "g");
        } else {
          let n = 0;
          let r;
          for (let i = 0; i < 60; i++) { r = charge(s, "search", t + i * 160); if (r.action !== "allow") break; n += 1; }
          if (n) line(script, `${n} × GET /api/search`, `−${fmt(n * 5)}`, "c");
          if (r.action === "challenge") {
            const g = nextGrant(s, r.challenge, t);
            line(script, "out of credit: human check", "403", "x");
            const got = pass(s, r.challenge, t);
            scale = Math.max(got, 300);
            checks += 1;
            line(script, g < 3000 ? `pass ${checks}: grant halves` : "passed via paid solver", `+${fmt(got)}`, "g");
            script.verdict.textContent = `Human checks bought: ${checks}. Each buys half the last.`;
          } else if (r.action === "throttle") {
            throttled = true;
            line(script, "grants used up: throttled", "429", "x");
            script.verdict.textContent = "Throttled: about 4 searches a minute, on the refill.";
          }
        }
      }
      meter(script, s.credits, scale);
      if (step > 36) { clearInterval(timer); replay.hidden = false; }
    }, SPEED);
  }

  replay.addEventListener("click", () => { replay.hidden = true; run(); });
  // Run while on screen; never spend CPU on it otherwise.
  let started = false;
  new IntersectionObserver((entries) => {
    const vis = entries.some((e) => e.isIntersecting);
    if (vis && !started) { started = true; run(); }
  }, { threshold: 0.25 }).observe(sim);
}

/* ---------- 2. Act I: the stage follows the step being read. ---------- */
const stage = document.querySelector("[data-stage]");
if (stage) {
  const rows = [...stage.querySelectorAll("[data-row]")];
  const bal = stage.querySelector("[data-stage-bal]");
  const spent = stage.querySelector("[data-cell-spent]");
  const set = (n) => {
    stage.dataset.step = n;
    rows.forEach((r) => {
      const k = +r.dataset.row;
      r.classList.toggle("lit", k <= n);
      r.classList.toggle("now", k === n);
    });
    bal.textContent = n >= 3 ? "207" : "212";
    spent.className = n >= 3 ? "burn" : "on";
  };
  set(1);
  const steps = [...document.querySelectorAll("[data-st]")];
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting) set(+e.target.dataset.st);
  }, { rootMargin: "-45% 0px -45% 0px" });
  steps.forEach((s) => io.observe(s));
}

/* ---------- 3. Act III: the answer types itself in when the chat comes into view. ---------- */
const chat = document.querySelector("[data-chat]");
if (chat && !reduce && "IntersectionObserver" in window) {
  const r = chat.getBoundingClientRect();
  if (r.top > innerHeight) {
    chat.classList.add("typing");
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); setTimeout(() => chat.classList.remove("typing"), 250); }
    }, { threshold: 0.6 });
    io.observe(chat);
  }
}

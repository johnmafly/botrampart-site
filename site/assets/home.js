// Home page ledger: two sessions under the proposed default policy, run by the same reference
// implementation the tests check (economics.mjs). Each tick is 10 simulated seconds.
// Without JavaScript, or with reduced motion, the static ledger in the HTML stays as it is.
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const ledger = document.querySelector(".ledger");

if (ledger && !reduce) {
  import("/assets/economics.mjs").then(({ newSession, charge, pass, nextGrant }) => {
    const TICK = 10000;
    const SPEED = 650;
    const MAX_LINES = 8;
    const fmt = (n) => Math.round(n).toLocaleString("en-US");
    const lane = (name) => {
      const el = ledger.querySelector(`[data-lane="${name}"]`);
      return { tape: el.querySelector(".tape"), meter: el.querySelector(".meter"), fill: el.querySelector(".meter i"), bal: el.querySelector("[data-bal]") };
    };
    const person = lane("person");
    const script = lane("script");
    const replay = ledger.querySelector("[data-replay]");

    function line(l, text, amount, cls) {
      const li = document.createElement("li");
      li.className = "new";
      const a = document.createElement("span");
      a.textContent = text;
      const b = document.createElement("span");
      b.textContent = amount;
      b.className = cls;
      li.append(a, b);
      l.tape.append(li);
      while (l.tape.children.length > MAX_LINES) l.tape.firstElementChild.remove();
    }
    function meter(l, credits, scale) {
      l.fill.style.width = `${Math.max(0, Math.min(100, (credits / scale) * 100))}%`;
      l.meter.classList.toggle("low", credits < scale * 0.2);
      l.bal.textContent = fmt(credits);
    }

    // A person: a few catalogue pages a minute and the occasional search.
    const personPlan = [["general", "GET /products/42"], ["general", "GET /products/42/reviews"], null, ["search", "GET /api/search?q=boots"], ["general", "GET /products/77"], null, ["general", "GET /cart"], ["search", "GET /api/search?q=boots+wide"], null, ["general", "GET /products/77/sizes"]];
    let timer;

    function run() {
      clearInterval(timer);
      person.tape.textContent = "";
      script.tape.textContent = "";
      let t = Date.UTC(2026, 10, 16, 10, 12, 0);
      const p = newSession(t);
      const s = newSession(t);
      let step = 0;
      let scale = 300;
      let throttled = false;
      line(person, "GET /products (first visit)", "tier 0", "");
      line(script, "GET /api/search (no cookie)", "tier 0", "");

      timer = setInterval(() => {
        t += TICK;
        step += 1;

        // Person lane
        if (step === 1) { pass(p, "pow", t); line(person, "proof-of-work, in the background", "+300", "g"); }
        else {
          const req = personPlan[step % personPlan.length];
          if (req) {
            const r = charge(p, req[0], t);
            line(person, req[1], `−${r.cost}`, "c");
          } else {
            const before = p.credits; charge(p, "static", t);
            const gained = p.credits - before;
            line(person, gained >= 0.5 ? "reading, credit refills" : "reading, balance full", gained >= 0.5 ? `+${fmt(gained)}` : "·", "g");
          }
        }
        meter(person, p.credits, 300);

        // Script lane: 60 searches every 10 seconds
        if (!throttled) {
          if (step === 1) {
            const r = charge(s, "search", t);
            line(script, `search needs tier 1: ${r.challenge}`, "403", "x");
            const g = pass(s, "pow", t); scale = g;
            line(script, "proof-of-work solved in 41 ms", `+${fmt(g)}`, "g");
          } else {
            let n = 0; let r;
            for (let i = 0; i < 60; i++) { r = charge(s, "search", t + i * 160); if (r.action !== "allow") break; n += 1; }
            if (n) line(script, `${n} × GET /api/search`, `−${fmt(n * 5)}`, "c");
            if (r.action === "challenge") {
              const g = nextGrant(s, r.challenge, t);
              line(script, `over budget: ${r.challenge} check`, "403", "x");
              const got = pass(s, r.challenge, t); scale = got;
              line(script, `passed via paid solver${g < 3000 ? ", grant halves" : ""}`, `+${fmt(got)}`, "g");
            } else if (r.action === "throttle") {
              throttled = true;
              line(script, "grants used up: throttled", "429", "x");
              line(script, "refill only: about 4 searches a minute", "", "");
            }
          }
        }
        meter(script, s.credits, scale);

        if (step > 40) { clearInterval(timer); replay.hidden = false; }
      }, SPEED);
    }

    replay.addEventListener("click", () => { replay.hidden = true; run(); });
    // Start when the ledger is on screen; pause the work entirely when it is not needed.
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { io.disconnect(); run(); }
    });
    io.observe(ledger);
  });
}

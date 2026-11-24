// Home page motion. Everything here only adds to a page that is complete without it:
// the headline, the gate and the chat are fully written into the HTML. With
// reduced motion, or while a piece is off screen, nothing runs.
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 2. The agent's answer types itself in when the chat comes into view. ---------- */
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

/* ---------- 3. Arriving at the Autoinstall section from a link elsewhere. ---------- */
// "Copy agent prompt" copies on every page (site.js). Where it cannot, it is a plain link to
// /#autoinstall: on arrival, focus lands on the section's own Copy prompt button, scrolled into view
// where the picker pushes it down, so copying is one click away.
const autoinstall = document.getElementById("autoinstall");
const cue = () => {
  const btn = autoinstall?.querySelector("[data-ai-copy]:not([hidden])");
  if (!btn) return;
  btn.focus({ preventScroll: true });
  const r = btn.getBoundingClientRect();
  if (r.top < 0 || r.bottom > innerHeight) btn.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  btn.classList.add("is-cued");
  setTimeout(() => btn.classList.remove("is-cued"), 4000);
};
if (location.hash === "#autoinstall") addEventListener("load", () => setTimeout(cue, 0), { once: true });

/* ---------- 4. The headline's keywords roll; "Stop" and "in your" never move. ---------- */
// The h1's accessible name is one fixed sentence (a visually hidden span naming all three pairs);
// the rolling words are aria-hidden. Without JavaScript or with reduced motion, the first pair stays.
const roll = document.querySelector("[data-roll]");
if (roll && !reduce) {
  const slots = [...roll.querySelectorAll(".slot")];
  const count = slots[0]?.children.length ?? 0;
  let at = 0;
  let onScreen = true;
  const step = () => {
    if (!onScreen || document.hidden) return;
    const from = at;
    at = (at + 1) % count;
    for (const slot of slots) {
      const out = slot.children[from];
      const next = slot.children[at];
      out.classList.replace("is-on", "is-out");
      next.classList.add("is-on");
      setTimeout(() => {
        // Park the word that left below its slot again, without animating the trip.
        out.classList.add("no-anim");
        out.classList.remove("is-out");
        void out.offsetWidth;
        out.classList.remove("no-anim");
      }, 800);
    }
  };
  if (count > 1) {
    roll.classList.add("is-rolling");
    setInterval(step, 2800);
    if ("IntersectionObserver" in window) new IntersectionObserver((e) => { onScreen = e.some((x) => x.isIntersecting); }).observe(roll);
  }
}

/* ---------- 5. The gate replays its four visitors while it is on screen. ---------- */
// The HTML is the end state (every visitor at its verdict). data-live starts the CSS loop the
// first time the stage is in view; data-off pauses it while it is off screen.
const gateEl = document.querySelector("[data-gate]");
if (gateEl && !reduce && "IntersectionObserver" in window) {
  new IntersectionObserver((entries) => {
    const on = entries.some((e) => e.isIntersecting);
    if (on) { gateEl.dataset.live = ""; delete gateEl.dataset.off; }
    else if ("live" in gateEl.dataset) gateEl.dataset.off = "";
  }, { threshold: 0.35 }).observe(gateEl.querySelector(".gate-stage"));
}

// Home page motion. Everything here only adds to a page that is complete without it:
// the decision log and the chat are fully written into the HTML. With reduced motion,
// or while the log is off screen, nothing runs.
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

/* ---------- 1. The decision log prints new sample lines while it is on screen. ---------- */
const feed = document.querySelector("[data-feed]");
if (feed && !reduce && "IntersectionObserver" in window) {
  // Sample sessions only, the same kinds as the written rows: [what the server saw, risk, decision, kind].
  const SAMPLES = [
    ["31 inputs · proof-of-work in 410 ms", "0", "allow", "ok"],
    ["automation flag · proof-of-work in 3 ms", "5", "human check", "ask"],
    ["no input after 30 requests · out of budget", "4", "next tier: proof-of-work", "ask"],
    ["verified monitoring service", "–", "allow", "ok"],
    ["not a browser: version over 3 years old", "–", "block", "no"],
    ["9 inputs · signed in", "0", "allow", "ok"],
    ["grants used up for today", "2", "throttle 429", "slow"],
    ["automation flag · 5 network changes in an hour", "6", "human check", "ask"],
    ["14 inputs · proof-of-work in 520 ms", "0", "allow", "ok"],
  ];
  const ID = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const id = () => "BR-" + Array.from({ length: 4 }, () => ID[Math.floor(Math.random() * ID.length)]).join("");
  let clock = Date.UTC(2026, 10, 16, 10, 12, 8);
  let i = 0;
  let timer = null;
  const span = (cls, text) => {
    const s = document.createElement("span");
    s.className = cls;
    s.textContent = text;
    return s;
  };
  const tick = () => {
    const [what, risk, decision, kind] = SAMPLES[i++ % SAMPLES.length];
    clock += 1000 + Math.floor(Math.random() * 1500);
    const li = document.createElement("li");
    li.className = "new";
    li.append(span("t", new Date(clock).toISOString().slice(11, 19)), span("s", id()), span("w", what), span("r", risk), span(`d ${kind}`, decision));
    feed.prepend(li);
    while (feed.children.length > 6) feed.lastElementChild.remove();
  };
  new IntersectionObserver((entries) => {
    const on = entries.some((e) => e.isIntersecting);
    if (on && !timer) timer = setInterval(tick, 2200);
    if (!on && timer) { clearInterval(timer); timer = null; }
  }, { threshold: 0.3 }).observe(feed);
}

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

/* ---------- 3. "Copy agent prompt" in the first screen. ---------- */
// Without JavaScript it is a link to the Express section. With it, it copies the prompt for the
// picker's current choices (the defaults until the reader changes them), says so, and scrolls to
// Express so the reader can change the picks.
const agentBtn = document.querySelector("[data-copy-agent-prompt]");
const agentStatus = document.querySelector("[data-copy-agent-status]");
if (agentBtn) {
  agentBtn.addEventListener("click", async (e) => {
    const prompt = document.querySelector("[data-ai-prompt]")?.textContent ?? "";
    if (!prompt) return;
    e.preventDefault();
    let ok = false;
    try { await navigator.clipboard.writeText(prompt); ok = true; } catch { ok = false; }
    const label = agentBtn.textContent;
    agentBtn.textContent = ok ? "Copied" : "Copy agent prompt";
    agentBtn.dataset.state = ok ? "copied" : "";
    if (agentStatus) agentStatus.textContent = ok ? "Copied the install prompt for the default stack. Change the picks below." : "Your browser blocked copying. The prompt is in the Express section below.";
    setTimeout(() => { agentBtn.textContent = label; delete agentBtn.dataset.state; }, 2400);
    const target = document.getElementById("express");
    if (target) {
      history.pushState(null, "", "#express");
      setTimeout(() => target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" }), ok ? 500 : 0);
    }
  });
}

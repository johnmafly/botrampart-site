// Cloud plan calculator: the cheapest proposed plan for a number of protected sessions.
const PLANS = [
  { name: "Free", fee: 0, included: 10_000, per1k: null },
  { name: "Starter", fee: 49, included: 100_000, per1k: 0.3 },
  { name: "Growth", fee: 249, included: 1_000_000, per1k: 0.2 },
  { name: "Scale", fee: 999, included: 10_000_000, per1k: 0.1 },
];
const root = document.querySelector("[data-calc]");
if (root) {
  const input = root.querySelector("input");
  const out = root.querySelector("output");
  const detail = root.querySelector("[data-calc-detail]");
  const fmt = (n) => Math.round(n).toLocaleString("en-US");
  // Slider position 0..100 maps to 1,000 .. 50,000,000 sessions on a log scale, rounded to 2 figures.
  const sessionsAt = (v) => {
    const raw = 10 ** (3 + (v / 100) * Math.log10(50_000));
    const mag = 10 ** Math.max(0, Math.floor(Math.log10(raw)) - 1);
    return Math.round(raw / mag) * mag;
  };
  const cost = (p, n) => (n <= p.included ? p.fee : p.per1k == null ? Infinity : p.fee + ((n - p.included) / 1000) * p.per1k);
  function update() {
    const n = sessionsAt(+input.value);
    const best = PLANS.map((p) => ({ p, c: cost(p, n) })).sort((a, b) => a.c - b.c)[0];
    out.textContent = `${best.p.name}: $${fmt(best.c)} a month`;
    const per = n ? (best.c / n) * 1000 : 0;
    detail.textContent = `For ${fmt(n)} protected sessions, about $${per.toFixed(2)} per 1,000. Proposed prices; nothing is for sale yet.`;
    input.setAttribute("aria-valuetext", `${fmt(n)} sessions`);
  }
  input.addEventListener("input", update);
  update();
}

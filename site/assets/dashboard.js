// Console preview. The page is complete without this script: every view is written into the
// HTML (the first sample site), stacked, with the sidebar as anchor links. This script only adds:
// one view at a time (from the URL hash), the site switcher, decision search and selection,
// chart readouts and the agent's sample questions. It stores nothing and sends nothing; the
// selected view lives in the URL hash only.
import { SITES, siteData, viewOverview, viewDecisions, decisionDetail, viewPolicy, viewAgent, viewSettings } from "/assets/dashboard-data.mjs";

const app = document.querySelector("[data-app]");
if (app) {
  const NAMES = ["overview", "decisions", "policy", "agent", "benchmark", "settings"];
  const views = Object.fromEntries(NAMES.map((n) => [n, app.querySelector(`#${n}`)]));
  const links = [...app.querySelectorAll("[data-nav] a")];
  let site = SITES[0].id;
  let selected = null;
  let extra = 0;

  app.classList.add("js");
  for (const el of app.querySelectorAll("[data-js-only]")) el.hidden = false;

  /* ---------- One view at a time ---------- */
  const show = (name, focus) => {
    if (!views[name]) name = "overview";
    for (const n of NAMES) views[n].classList.toggle("on", n === name);
    for (const a of links) {
      if (a.hash === `#${name}`) a.setAttribute("aria-current", "page");
      else a.removeAttribute("aria-current");
    }
    const title = app.querySelector("[data-view-title]");
    if (title) title.textContent = views[name].querySelector("h2").textContent;
    if (focus) {
      const h = views[name].querySelector("h2");
      h.setAttribute("tabindex", "-1");
      h.focus({ preventScroll: true });
      const top = app.getBoundingClientRect().top + scrollY - 80;
      if (scrollY > top) scrollTo({ top, behavior: "instant" });
    }
  };
  addEventListener("hashchange", () => show(location.hash.slice(1), true));
  show(location.hash.slice(1), false);
  // Views are shown one at a time, so the browser's jump to the #view anchor would only hide the top bar.
  if (location.hash) { scrollTo({ top: 0, behavior: "instant" }); addEventListener("load", () => scrollTo({ top: 0, behavior: "instant" }), { once: true }); }

  /* ---------- Rendering for the selected site ---------- */
  const fill = (name, html) => { views[name].querySelector("[data-body]").innerHTML = html; };
  const render = () => {
    const D = siteData(site);
    fill("overview", viewOverview(D));
    fill("decisions", viewDecisions(D, selected));
    fill("policy", viewPolicy(D));
    fill("agent", viewAgent(D, extra));
    fill("settings", viewSettings(D));
    for (const el of app.querySelectorAll("[data-js-only]")) el.hidden = false;
    for (const el of app.querySelectorAll("[data-site-name]")) el.textContent = D.site.domain;
    bindChart();
    filter();
  };

  const switcher = app.querySelector("[data-site]");
  if (switcher) {
    switcher.addEventListener("change", () => {
      site = switcher.value;
      selected = null;
      extra = 0;
      render();
    });
  }

  /* ---------- Chart readout ---------- */
  function bindChart() {
    const chart = views.overview.querySelector(".dchart");
    const out = views.overview.querySelector("[data-readout]");
    if (!chart || !out) return;
    const initial = out.textContent;
    const set = (g) => {
      for (const b of chart.querySelectorAll(".bar.lit")) b.classList.remove("lit");
      if (g) { g.classList.add("lit"); out.textContent = g.dataset.label; } else out.textContent = initial;
    };
    chart.addEventListener("pointerover", (e) => set(e.target.closest(".bar")));
    chart.addEventListener("pointerleave", () => set(null));
  }

  /* ---------- Decisions: search, filter, select ---------- */
  function filter() {
    const q = (app.querySelector("[data-search]")?.value || "").trim().toLowerCase();
    const action = app.querySelector("[data-filter]")?.value || "";
    const rows = [...views.decisions.querySelectorAll("tr[data-row]")];
    let n = 0;
    for (const tr of rows) {
      const hit = (!q || tr.dataset.text.includes(q)) && (!action || tr.dataset.text.split(" ").includes(action));
      tr.hidden = !hit;
      if (hit) n++;
    }
    const count = views.decisions.querySelector("[data-count]");
    if (count) count.textContent = `${n} of ${rows.length} records · sample data · allow decisions are not listed`;
  }
  views.decisions.addEventListener("input", (e) => { if (e.target.matches("[data-search], [data-filter]")) filter(); });
  views.decisions.addEventListener("change", (e) => { if (e.target.matches("[data-filter]")) filter(); });
  views.decisions.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-ref]");
    if (!b) return;
    selected = b.dataset.ref;
    const d = siteData(site).decisions.find((x) => x.ref === selected);
    for (const tr of views.decisions.querySelectorAll("tr[data-row]")) {
      const on = tr.dataset.row === selected;
      tr.classList.toggle("on", on);
      tr.querySelector("button").setAttribute("aria-pressed", String(on));
    }
    const detail = views.decisions.querySelector("[data-detail]");
    detail.innerHTML = decisionDetail(d);
    if (matchMedia("(max-width: 1100px)").matches) detail.scrollIntoView({ block: "start", behavior: "instant" });
  });

  /* ---------- Agent: more sample questions ---------- */
  views.agent.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-more]");
    if (!b) return;
    extra = Number(b.dataset.more) + 1;
    fill("agent", viewAgent(siteData(site), extra));
    for (const el of views.agent.querySelectorAll("[data-js-only]")) el.hidden = false;
    const msgs = views.agent.querySelectorAll(".msg.a");
    const last = msgs[msgs.length - 1];
    last.setAttribute("tabindex", "-1");
    last.focus({ preventScroll: false });
    const next = views.agent.querySelector("button[data-more]");
    if (!next) views.agent.querySelector(".chips")?.focus?.();
  });

  bindChart();
  filter();
}

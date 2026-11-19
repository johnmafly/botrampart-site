// Docs reader tools. Everything here adds to pages that already work without JavaScript:
//   ⌘K / Ctrl K / "/" search (MiniSearch over /docs/search-index.json, all in the browser),
//   the theme toggle, copy buttons on code blocks, tabs (synced by group), "Copy page" and the
//   Express "Copy prompt" card.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

async function copyText(text) {
  try { await navigator.clipboard.writeText(text); return true; } catch { /* fall back below */ }
  const ta = document.createElement("textarea");
  ta.value = text; ta.setAttribute("readonly", ""); ta.className = "visually-hidden";
  document.body.append(ta); ta.select();
  let ok = false;
  try { ok = document.execCommand("copy"); } catch { ok = false; }
  ta.remove();
  return ok;
}
function flash(btn, label, ok) {
  const was = btn.dataset.label ?? btn.textContent;
  btn.dataset.label = was;
  btn.dataset.state = ok ? "copied" : "failed";
  btn.textContent = ok ? label : "Copy failed";
  clearTimeout(btn._t);
  btn._t = setTimeout(() => { btn.textContent = was; delete btn.dataset.state; }, 1800);
}

// ---------- Theme ----------
const root = document.documentElement;
const systemDark = matchMedia("(prefers-color-scheme: dark)");
const effective = () => root.dataset.theme ?? (systemDark.matches ? "dark" : "light");
function labelTheme(btn) { btn.setAttribute("aria-label", `Switch to ${effective() === "dark" ? "light" : "dark"} theme`); }
for (const btn of $$("[data-theme-toggle]")) {
  btn.hidden = false;
  labelTheme(btn);
  btn.addEventListener("click", () => {
    const next = effective() === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("br-theme", next); } catch { /* not stored */ }
    labelTheme(btn);
  });
  systemDark.addEventListener("change", () => labelTheme(btn));
}

// ---------- Copy buttons on code blocks ----------
for (const block of $$(".code")) {
  const head = $(".code-head", block);
  const code = $("pre code", block);
  if (!head || !code) continue;
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "code-copy"; btn.textContent = "Copy";
  const name = $(".code-title, .code-lang", head)?.textContent ?? "code";
  btn.setAttribute("aria-label", `Copy code: ${name}`);
  btn.addEventListener("click", async () => flash(btn, "Copied", await copyText(code.textContent)));
  head.append(btn);
}

// ---------- Tabs ----------
const tabKey = (group) => `br-tab:${group}`;
function selectTab(set, label, focus = false) {
  for (const tab of $$("[role=tab]", set)) {
    const on = tab.dataset.tab === label;
    tab.setAttribute("aria-selected", String(on));
    tab.tabIndex = on ? 0 : -1;
    if (on && focus) tab.focus();
  }
  for (const panel of $$(".tab-panel", set)) panel.hidden = panel.dataset.tab !== label;
}
$$(".tabs").forEach((set, n) => {
  const group = set.dataset.tabs;
  const panels = $$(".tab-panel", set);
  const list = document.createElement("div");
  list.className = "tab-list"; list.setAttribute("role", "tablist");
  list.setAttribute("aria-label", panels.map((p) => p.dataset.tab).join(", "));
  panels.forEach((panel, k) => {
    const id = `tabs-${n}-${k}`;
    const tab = document.createElement("button");
    tab.type = "button"; tab.setAttribute("role", "tab"); tab.id = `${id}-tab`; tab.dataset.tab = panel.dataset.tab;
    tab.textContent = panel.dataset.tab; tab.setAttribute("aria-controls", id);
    panel.id = id; panel.setAttribute("role", "tabpanel"); panel.setAttribute("aria-labelledby", tab.id);
    tab.addEventListener("click", () => {
      try { localStorage.setItem(tabKey(group), panel.dataset.tab); } catch { /* not stored */ }
      for (const other of $$(`.tabs[data-tabs="${group}"]`)) selectTab(other, panel.dataset.tab);
    });
    tab.addEventListener("keydown", (e) => {
      const tabs = $$("[role=tab]", list);
      const k2 = tabs.indexOf(tab);
      const to = e.key === "ArrowRight" ? (k2 + 1) % tabs.length : e.key === "ArrowLeft" ? (k2 - 1 + tabs.length) % tabs.length : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : -1;
      if (to < 0) return;
      e.preventDefault();
      tabs[to].click();
      tabs[to].focus();
    });
    list.append(tab);
  });
  set.prepend(list);
  set.dataset.ready = "";
  let saved = null;
  try { saved = localStorage.getItem(tabKey(group)); } catch { /* none */ }
  selectTab(set, panels.some((p) => p.dataset.tab === saved) ? saved : panels[0].dataset.tab);
});

// ---------- Copy page and the Express card ----------
for (const btn of $$("[data-copy-md]")) {
  btn.addEventListener("click", async () => {
    let ok = false;
    try {
      const res = await fetch(btn.dataset.copyMd);
      if (res.ok) ok = await copyText(await res.text());
    } catch { ok = false; }
    flash(btn, "Copied", ok);
  });
}
for (const btn of $$("[data-copy-template]")) {
  btn.addEventListener("click", async () => {
    const t = document.getElementById(btn.dataset.copyTemplate);
    flash(btn, "Copied", !!t && await copyText(t.content.textContent));
  });
}
// The Copy page menu closes on Escape and on a click outside it.
for (const d of $$(".cp-more")) {
  document.addEventListener("click", (e) => { if (d.open && !d.contains(e.target)) d.open = false; });
  d.addEventListener("keydown", (e) => { if (e.key === "Escape" && d.open) { d.open = false; $("summary", d).focus(); } });
}

// ---------- Search ----------
const SUGGESTED = [
  ["Quickstart", "/docs/getting-started/", "First decision in observe mode"],
  ["Express", "/docs/express/", "Install with one AI prompt"],
  ["Choose how to integrate", "/docs/choose/", "App SDK or an edge adapter"],
  ["API reference", "/docs/api/", "Every route, generated from the spec"],
  ["Policy and cohort reference", "/docs/policy/", "Path classes, budgets, rules"],
  ["Configuration", "/docs/configuration/", "Every setting and secret"],
];
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
let dlg = null, mini = null, docs = null, active = -1;

function buildDialog() {
  dlg = document.createElement("dialog");
  dlg.className = "search-dlg";
  dlg.setAttribute("aria-label", "Search the docs");
  dlg.innerHTML = `<div class="sd-head"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>` +
    `<input class="sd-input" type="text" enterkeyhint="go" placeholder="Search the docs" aria-label="Search the docs" aria-controls="sd-results" aria-autocomplete="list" autocomplete="off" spellcheck="false">` +
    `<button type="button" class="sd-close" aria-label="Close search">Esc</button></div>` +
    `<div class="sd-body" id="sd-results" aria-live="polite"></div>` +
    `<div class="sd-foot" aria-hidden="true"><span>↑ ↓ to move</span><span>↵ to open</span><span>Esc to close</span></div>`;
  document.body.append(dlg);
  const input = $(".sd-input", dlg);
  input.addEventListener("input", () => render(input.value));
  input.addEventListener("keydown", (e) => {
    if (e.key === "Escape") { e.preventDefault(); dlg.close(); return; }
    const links = $$(".sd-list a", dlg);
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (!links.length) return;
      active = (active + (e.key === "ArrowDown" ? 1 : -1) + links.length) % links.length;
      mark(links);
    } else if (e.key === "Enter" && links[Math.max(active, 0)]) {
      e.preventDefault();
      go(links[Math.max(active, 0)].getAttribute("href"));
    }
  });
  $(".sd-close", dlg).addEventListener("click", () => dlg.close());
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener("close", () => $(".search-btn")?.focus());
}
function mark(links) {
  links.forEach((a, k) => a.setAttribute("aria-selected", String(k === active)));
  links[active]?.scrollIntoView({ block: "nearest" });
}
function go(href) {
  dlg.close();
  location.href = href;
}
const list = (k, items) => `<p class="sd-k">${k}</p><ul class="sd-list" role="listbox" aria-label="${k}">${items.join("")}</ul>`;
const item = (title, href, sub) => `<li role="none"><a role="option" href="${href}"><b>${title}</b><span>${sub}</span></a></li>`;
function highlight(text, terms) {
  let out = esc(text);
  for (const t of terms) if (t.length > 1) out = out.replace(new RegExp(`(${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "ig"), "<mark>$1</mark>");
  return out;
}
function render(q) {
  const body = $("#sd-results", dlg);
  active = -1;
  q = q.trim();
  if (!q) {
    body.innerHTML = list("Suggested", SUGGESTED.map(([t, h, s]) => item(esc(t), h, esc(s))));
    return;
  }
  if (!mini) { body.innerHTML = `<p class="sd-empty">Loading the index…</p>`; return; }
  const hits = mini.search(q, { prefix: true, fuzzy: 0.15, boost: { title: 3, page: 1.5 } }).slice(0, 12);
  const terms = q.toLowerCase().split(/\s+/);
  body.innerHTML = hits.length
    ? list("Results", hits.map((h) => {
      const d = docs[h.id];
      const snippet = d.text.length > 140 ? `${d.text.slice(0, 140)}…` : d.text;
      return item(highlight(d.title, terms), d.url, `${esc(d.group)} · ${esc(d.page)}${snippet ? ` · ${highlight(snippet, terms)}` : ""}`);
    }))
    : `<p class="sd-empty">No results for “${esc(q)}”. Try a route like /_br/status, a header like BR-Decision, or a page name.</p>`;
}
async function loadIndex() {
  if (mini) return;
  const [{ default: MiniSearch }, res] = await Promise.all([import("/assets/vendor/minisearch.mjs"), fetch("/docs/search-index.json")]);
  docs = await res.json();
  mini = new MiniSearch({ fields: ["title", "page", "text"], storeFields: [] });
  mini.addAll(docs);
}
async function openSearch() {
  if (!dlg) buildDialog();
  if (!dlg.open) dlg.showModal();
  const input = $(".sd-input", dlg);
  input.select();
  render(input.value);
  try { await loadIndex(); render(input.value); } catch { $("#sd-results", dlg).innerHTML = `<p class="sd-empty">Search could not load. Every page is listed in the sidebar.</p>`; }
}
for (const btn of $$("[data-search-open]")) { btn.hidden = false; btn.addEventListener("click", openSearch); }
document.addEventListener("keydown", (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
  if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openSearch(); }
  else if (e.key === "/" && !typing && !dlg?.open) { e.preventDefault(); openSearch(); }
});

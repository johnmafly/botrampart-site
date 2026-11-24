// Builds the static site into dist/ and writes /.well-known/greenhouse.json
// (Greenhouse package contract v1). No dependencies.
//
// Pages in site/ are full HTML documents that may contain three markers, replaced here so every
// page shares one head, header and footer:
//   <!-- @head | Page title | Meta description -->
//   <!-- @header -->   <!-- @footer -->
// A page whose <html> has class="docs" (the docs, scripts/docs.mjs) also gets docs.css, theme.js
// (the stored light or dark choice, before first paint) and docs.js, and the header's search and
// theme buttons in place of <!-- @docs-tools -->; other pages drop that marker.
// The partials live in site/_partials/ and are not copied to dist/.
//
// Factual claims are cited as {{c:claim-id}}: the build looks the id up in claims.yaml, writes a
// numbered link to its source, and fails on an unknown id. <!-- @sources --> lists the page's
// sources with the verbatim quote and the date each was checked.
import { readClaims } from "./claims.mjs";
import { OPTIONS as AI_OPTIONS, DEFAULTS as AI_DEFAULTS, buildPrompt } from "../site/assets/ai-install.js";
import { buildDocsHtml, buildDocsText } from "./docs.mjs";
import { appendFileSync, cpSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { join, relative, sep } from "node:path";

const SLUG = "botrampart";
const root = new URL("..", import.meta.url).pathname;
const src = join(root, "site");
const out = join(root, "dist");
const partials = join(src, "_partials");

function commitSha() {
  const fromEnv = process.env.GITHUB_SHA || process.env.CF_PAGES_COMMIT_SHA;
  if (fromEnv) return fromEnv;
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
  } catch {
    throw new Error("No commit SHA: set GITHUB_SHA or CF_PAGES_COMMIT_SHA, or build inside a git checkout");
  }
}

const sha = commitSha();
if (!/^[0-9a-f]{40}$/.test(sha)) throw new Error(`Not a full commit SHA: ${sha}`);

const claims = new Map(readClaims(join(root, "claims.yaml")).map((c) => [c.id, c]));

function cite(html, route) {
  const order = [];
  html = html.replace(/\{\{c:([a-z0-9-]+)\}\}/g, (_, id) => {
    const c = claims.get(id);
    if (!c) throw new Error(`${route}: unknown claim ${id}`);
    if (!order.includes(id)) order.push(id);
    const n = order.indexOf(id) + 1;
    return `<sup class="ref"><a href="#src-${n}" data-claim="${id}" aria-label="Source ${n}">${n}</a></sup>`;
  });
  const list = order.length
    ? `<section class="sources-block" aria-labelledby="sources-h"><h2 id="sources-h" class="sources-h">Sources</h2>` +
      `<p class="fine">Every figure from someone else on this page, with the words it rests on. Checked on the date shown; the full ledger is <a href="https://github.com/johnmafly/botrampart-site/blob/main/claims.yaml">claims.yaml</a>.</p><ol class="sources">` +
      order.map((id, i) => {
        const c = claims.get(id);
        return `<li id="src-${i + 1}"><a href="${esc(c.source_url)}" rel="noopener">${esc(c.source_title || new URL(c.source_url).hostname)}</a>. <q>${esc(c.quote)}</q> <span class="muted">Checked ${esc(c.checked)}.</span></li>`;
      }).join("") + `</ol></section>`
    : "";
  if (order.length && !html.includes("<!-- @sources -->")) throw new Error(`${route}: cites claims but has no sources marker`);
  return html.replace("<!-- @sources -->", list);
}

const partial = (name) => readFileSync(join(partials, `${name}.html`), "utf8").trimEnd();
const esc = (s) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

// Route of a built file: dist/docs/index.html -> /docs/
const routeOf = (file) => {
  const rel = relative(out, file).split(sep).join("/");
  return rel === "index.html" ? "/" : rel.endsWith("/index.html") ? `/${rel.slice(0, -10)}` : `/${rel}`;
};

// Mark the current page (exact match) and the current section (prefix match, for Docs).
function markCurrent(html, route) {
  return html.replace(/<a href="(\/[^"]*)"(?: data-section)?/g, (m, href) => {
    const section = m.includes("data-section");
    const plain = `<a href="${href}"`;
    if (href === route) return `${plain} aria-current="page"`;
    if (section && href !== "/" && route.startsWith(href)) return `${plain} aria-current="true"`;
    return plain;
  });
}

// Code blocks and wide tables scroll sideways on small screens. Make each a labelled, focusable
// region so keyboard users can scroll it (axe: scrollable-region-focusable). The label is the
// nearest heading above it.
function scrollRegions(html, route) {
  let heading = "";
  const used = new Map();
  return html.replace(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>|<pre(?![^>]*tabindex)|<div class="tablewrap[^"]*"(?![^>]*tabindex)/g, (m, text) => {
    if (text !== undefined) {
      heading = text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      return m;
    }
    if (!heading) throw new Error(`${route}: scrollable region without a heading above it`);
    // Labels must be unique per page (axe: landmark-unique), so a second block under the same
    // heading gets "(2)", and so on.
    const base = `${m.startsWith("<pre") ? "Code" : "Table"}: ${heading}`;
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const label = n === 1 ? base : `${base} (${n})`;
    return `${m} tabindex="0" role="region" aria-label="${esc(label)}"`;
  });
}

// <!-- @toc --> becomes an "On this page" nav built from the page's h2 elements that have an id.
function toc(html, route) {
  if (!html.includes("<!-- @toc -->")) return html;
  const items = [...html.matchAll(/<h2 id="([^"]+)"[^>]*>(.*?)<\/h2>/g)].map(([, id, text]) => `<li><a href="#${id}">${text.replace(/<[^>]+>/g, "")}</a></li>`);
  if (!items.length) throw new Error(`${route}: @toc but no h2 with an id`);
  return html.replace("<!-- @toc -->", `<nav class="docnav" aria-label="On this page"><p class="docnav-title">On this page</p><ol>${items.join("")}</ol><p class="docnav-spec">Build it: <a href="/docs/choose/">start in observe mode</a></p></nav>`);
}

// Cloudflare's email obfuscation rewrites any address in page text (the spec's
// ops@example.com examples on /docs/api/) into a /cdn-cgi/l/email-protection link
// plus an injected, unfingerprinted decode script. Its documented opt-out is the
// email_off comment pair, so wrap every address in text (never inside a tag).
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
function emailOff(html) {
  return html.replace(/(^|>)([^<]+)/g, (m, gt, text) =>
    gt + text.replace(EMAIL, (addr) => `<!--email_off-->${addr}<!--/email_off-->`));
}


// Express (one-prompt install): <!-- @ai-picker:full --> or <!-- @ai-picker:home --> becomes the stack
// picker built from ai-install.js's OPTIONS, and <!-- @ai-prompt --> the prompt for the preselected
// choices, so the page reads complete without JavaScript and never drifts from the module.
const AI_LEGEND = { framework: "Framework", runtime: "Where your app runs", edge: "CDN or edge", infra: "Cloud for Core and the log", iac: "Provision with", model: "Decision model", agent: "Your coding agent" };
const AI_SUB = {
  framework: (o) => o.lang,
  runtime: () => "",
  edge: (o) => ({ none: "SDK in the app", cloudflare: "Worker in your account", cloudfront: "Lambda@Edge", nginx: "nginx module" })[o.value],
  infra: (o) => `${o.core} · ${o.bucket}`,
  iac: (o) => ({ terraform: "plan, then apply", pulumi: "preview, then up", cli: "one reviewed script" })[o.value],
  model: (o) => ({ off: "Turn on any time", gemini: "Hosted", local: "Nothing leaves your network" })[o.value],
  agent: () => "",
};
const AI_HOME = ["framework", "runtime", "edge", "infra"];
function aiPicker(html) {
  html = html.replace(/<!-- @ai-picker:(full|home) -->/g, (_, variant) => {
    const keys = variant === "home" ? AI_HOME : Object.keys(AI_OPTIONS);
    return keys.map((k, i) => {
      const choices = AI_OPTIONS[k].map((o) => {
        const sub = AI_SUB[k](o);
        return `<label class="choice"><input type="radio" name="${k}" value="${o.value}"${AI_DEFAULTS[k] === o.value ? " checked" : ""}><span>${esc(o.label)}${sub ? `<small>${esc(sub)}</small>` : ""}</span></label>`;
      }).join("");
      return `<fieldset class="field"><legend><span class="ai-n">${i + 1}</span> ${AI_LEGEND[k]}</legend><div class="choices">${choices}</div></fieldset>`;
    }).join("\n");
  });
  return html.replace(/<!-- @ai-prompt -->/g, () => esc(buildPrompt()).replace(/>/g, "&gt;"));
}

// Search (⌘K) and the theme toggle, in the header of docs pages. Both need JavaScript, so they
// start hidden and docs.js shows them.
const DOCS_TOOLS = `<div class="docs-tools">` +
  `<button type="button" class="search-btn" data-search-open hidden aria-label="Search docs ⌘K" aria-keyshortcuts="Meta+K Control+K /"><svg viewBox="0 0 24 24" width="15" height="15" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg><span class="sb-text">Search docs</span><kbd>⌘K</kbd></button>` +
  `<button type="button" class="theme-btn" data-theme-toggle hidden aria-label="Switch theme"><svg class="i-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z"/></svg><svg class="i-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg></button>` +
  `</div>`;

// The home page's phone menu: below 560px the six menu pills fold into one "Menu" button (a
// <details>, so it opens without JavaScript). It lists the same links as the main menu, built from
// the header partial so the two never drift apart, plus Sign in and the quickstart.
function phoneMenu(header) {
  const nav = header.match(/<nav class="nav" aria-label="Main">([\s\S]*?)<\/nav>/)?.[1];
  if (!nav) throw new Error("header: main menu not found for the phone menu");
  const body = nav
    .replace(/<details class="menu" data-menu>\s*<summary>([^<]+)<\/summary>\s*<div class="menu-panel">/g, `<div class="pm-group"><p class="pm-h">$1</p><div class="pm-list">`)
    .replace(/<\/div>\s*<\/details>/g, "</div></div>")
    .replace(/ data-section/g, "")
    .replace(/\n\s*/g, "");
  return `<details class="m-menu" data-phone-menu><summary><svg class="pm-i" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path d="M3 5.5h14M3 10h14M3 14.5h14"/></svg><span class="pm-t">Menu</span></summary>` +
    `<nav class="pm-panel" aria-label="Menu">${body}<div class="pm-more"><a href="/signin/">Sign in</a></div></nav></details>`;
}

function render(file) {
  const route = routeOf(file);
  let html = readFileSync(file, "utf8");
  html = html.replace(/<!-- @head \| ([^|]+) \| ([^>]+?) -->/, (_, title, desc) =>
    partial("head").replace("{{title}}", esc(title.trim())).replace("{{description}}", esc(desc.trim())));
  for (const name of ["header", "footer"]) {
    html = html.replace(`<!-- @${name} -->`, markCurrent(partial(name), route));
  }
  const isDocs = /<html lang="en" class="docs">/.test(html);
  html = html.replace("<!-- @docs-tools -->", isDocs ? DOCS_TOOLS : "");
  html = html.replace(/(\n\s*)<!-- @phone-menu -->/, (_, lead) => route === "/" ? lead + markCurrent(phoneMenu(partial("header")), route) : "");
  if (isDocs) html = html.replace(/(<link rel="stylesheet" href="\/assets\/site\.css">)/, `$1\n    <link rel="stylesheet" href="/assets/docs.css">\n    <script src="/assets/theme.js"></script>\n    <script type="module" src="/assets/docs.js"></script>`);
  html = aiPicker(html);
  html = toc(html, route);
  html = cite(html, route);
  html = scrollRegions(html, route);
  if (/<!-- @/.test(html)) throw new Error(`${route}: unreplaced marker`);
  html = emailOff(html);
  writeFileSync(file, html);
}

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

rmSync(out, { recursive: true, force: true });
cpSync(src, out, { recursive: true, filter: (p) => !p.startsWith(partials) });
// The user guide: site/docs/*.md become /docs/<page>/ HTML pages here (scripts/docs.mjs).
const docs = buildDocsHtml({ out, root });
for (const file of walk(out)) if (file.endsWith(".html")) render(file);

// Fingerprint every same-origin asset (CSS, JS, modules, fonts, SVG): /assets/site.css becomes
// /assets/site.<content hash>.css, and every reference to it in HTML, CSS url() and JS imports is
// rewritten. A browser that cached an older file under its old name can then never pair it with
// newer HTML (it happened: v2 HTML rendered with a phone's cached v1 site.css). Files are hashed
// after their own references are rewritten, so a font change also renames the CSS that loads it.
// The unversioned names are not published: nothing references them.
const ASSET_REF = /\/assets\/[\w/.-]+?\.(?:css|js|mjs|woff2|svg)\b/g;
const FINGERPRINTED = /\.(?:css|js|mjs|woff2|svg)$/;
const urlOf = (file) => "/" + relative(out, file).split(sep).join("/");

function fingerprint() {
  const pending = new Map(walk(join(out, "assets")).filter((f) => FINGERPRINTED.test(f)).map((f) => [urlOf(f), f]));
  const renamed = new Map();
  while (pending.size) {
    let progressed = false;
    for (const [url, file] of pending) {
      let body = readFileSync(file);
      if (!file.endsWith(".woff2")) {
        const text = body.toString("utf8");
        const refs = new Set(text.match(ASSET_REF) ?? []);
        for (const r of refs) if (!renamed.has(r) && !pending.has(r)) throw new Error(`${url}: references missing asset ${r}`);
        if ([...refs].some((r) => r !== url && pending.has(r))) continue; // its dependencies first
        body = Buffer.from(text.replace(ASSET_REF, (r) => renamed.get(r) ?? r));
      }
      const hash = createHash("sha256").update(body).digest("hex").slice(0, 10);
      const hashed = file.replace(/(\.[a-z0-9]+)$/, `.${hash}$1`);
      writeFileSync(hashed, body);
      rmSync(file);
      renamed.set(url, urlOf(hashed));
      pending.delete(url);
      progressed = true;
    }
    if (!progressed) throw new Error(`asset reference cycle among ${[...pending.keys()].join(", ")}`);
  }
  for (const file of walk(out).filter((f) => f.endsWith(".html"))) {
    const html = readFileSync(file, "utf8").replace(ASSET_REF, (r) => {
      if (!renamed.has(r)) throw new Error(`${routeOf(file)}: references missing asset ${r}`);
      return renamed.get(r);
    });
    writeFileSync(file, html);
  }
  // Fingerprinted files never change under their name, so browsers may keep them for a year.
  // One rule per file: an /assets/* rule would also cover the unversioned font licences.
  appendFileSync(join(out, "_headers"), "\n# Fingerprinted assets (written by scripts/build.mjs): content-hashed names, cached for a year.\n" +
    [...renamed.values()].sort().map((u) => `${u}\n  Cache-Control: public, max-age=31536000, immutable\n`).join("\n"));
  return renamed;
}
const assets = fingerprint();

// The guide as Markdown (/docs/<page>.md), /llms.txt and /llms-full.txt, with fingerprinted asset URLs.
buildDocsText({ out, docs, claims, assets, sha });

// Copy the build spec so docs can link to it.
mkdirSync(join(out, "spec"), { recursive: true });
cpSync(join(root, "spec", "openapi.yaml"), join(out, "spec", "openapi.yaml"));

mkdirSync(join(out, ".well-known"), { recursive: true });
const info = { slug: SLUG, sha, built_at: new Date().toISOString() };
writeFileSync(join(out, ".well-known", "greenhouse.json"), JSON.stringify(info, null, 2) + "\n");
console.log(`dist/ built for ${SLUG} at ${sha} (${assets.size} fingerprinted assets)`);

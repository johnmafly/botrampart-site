// Builds the static site into dist/ and writes /.well-known/greenhouse.json
// (Greenhouse package contract v1). No dependencies.
//
// Pages in site/ are full HTML documents that may contain three markers, replaced here so every
// page shares one head, header and footer:
//   <!-- @head | Page title | Meta description -->
//   <!-- @header -->   <!-- @footer -->   <!-- @docs-nav -->
// The partials live in site/_partials/ and are not copied to dist/.
//
// Factual claims are cited as {{c:claim-id}}: the build looks the id up in claims.yaml, writes a
// numbered link to its source, and fails on an unknown id. <!-- @sources --> lists the page's
// sources with the verbatim quote and the date each was checked.
import { readClaims } from "./claims.mjs";
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
  return html.replace(/<h[1-4][^>]*>([\s\S]*?)<\/h[1-4]>|<pre(?![^>]*tabindex)|<div class="tablewrap"(?![^>]*tabindex)/g, (m, text) => {
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
  return html.replace("<!-- @toc -->", `<nav class="docnav" aria-label="On this page"><p class="docnav-title">On this page</p><ol>${items.join("")}</ol><p class="docnav-spec">Build it: <a href="/build/">start in observe mode</a></p></nav>`);
}

function render(file) {
  const route = routeOf(file);
  let html = readFileSync(file, "utf8");
  html = html.replace(/<!-- @head \| ([^|]+) \| ([^>]+?) -->/, (_, title, desc) =>
    partial("head").replace("{{title}}", esc(title.trim())).replace("{{description}}", esc(desc.trim())));
  for (const name of ["header", "footer", "docs-nav"]) {
    html = html.replace(`<!-- @${name} -->`, markCurrent(partial(name), route));
  }
  html = toc(html, route);
  html = cite(html, route);
  html = scrollRegions(html, route);
  if (/<!-- @/.test(html)) throw new Error(`${route}: unreplaced marker`);
  writeFileSync(file, html);
}

const walk = (dir) => readdirSync(dir).flatMap((name) => {
  const p = join(dir, name);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

rmSync(out, { recursive: true, force: true });
cpSync(src, out, { recursive: true, filter: (p) => !p.startsWith(partials) });
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

// Copy the build spec so docs can link to it.
mkdirSync(join(out, "spec"), { recursive: true });
cpSync(join(root, "spec", "openapi.yaml"), join(out, "spec", "openapi.yaml"));

mkdirSync(join(out, ".well-known"), { recursive: true });
const info = { slug: SLUG, sha, built_at: new Date().toISOString() };
writeFileSync(join(out, ".well-known", "greenhouse.json"), JSON.stringify(info, null, 2) + "\n");
console.log(`dist/ built for ${SLUG} at ${sha} (${assets.size} fingerprinted assets)`);

// Copy gate: the site reads as a shipping product. No status hedges anywhere in what it serves:
// HTML (text and attributes), JS and modules, YAML, TXT, JSON, CSS, headers and redirects.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
if (!existsSync(join(dist, "index.html"))) {
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });
}

export const BANNED = [
  /\bby design\b/i, /\bin design\b/i, /\bplanned\b/i, /\bplan to\b/i, /\bpropos/i, /\bhypothetical/i,
  /\bconcept/i, /\bdemo/i, /\bmock-?up/i, /\bprototype/i, /\broadmap/i, /\bcoming soon\b/i,
  /\bnot (yet )?built\b/i, /\bnot for sale\b/i, /\bnothing is for sale\b/i, /\bfor sale yet\b/i,
  /\billustrative/i, /\bnot a real\b/i, /\bfirst build\b/i, /\bcomes? later\b/i, /\bships later\b/i,
  /\barchitecture plan\b/i, /\bplaceholder copy\b/i,
];

const BINARY = /\.(woff2?|png|jpe?g|gif|webp|avif|ico)$/i;
const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : BINARY.test(p) ? [] : [p];
});
const decode = (s) => s
  .replace(/&nbsp;|&#160;|&#x0*a0;/gi, " ").replace(/&shy;|&#173;|&#x0*ad;/gi, "")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&rsquo;/g, "'");
// Rendered text: tags removed (so "by <b>design</b>" still matches), entities decoded, whitespace collapsed.
const rendered = (html) => decode(html.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ");

const files = walk(dist);

test("the served site has text files to check", () => {
  const kinds = new Set(files.map((f) => f.split(".").pop()));
  for (const k of ["html", "js", "mjs", "yaml", "css", "json"]) assert.ok(kinds.has(k), `dist has .${k} files`);
});

test("no banned status phrase anywhere the site serves", () => {
  const hits = [];
  for (const f of files) {
    const raw = readFileSync(f, "utf8");
    const views = f.endsWith(".html") ? [decode(raw).replace(/\s+/g, " "), rendered(raw)] : [raw.replace(/\s+/g, " ")];
    for (const re of BANNED) for (const v of views) {
      const m = v.match(re);
      if (m) { hits.push(`${relative(dist, f)}: "${v.slice(Math.max(0, m.index - 40), m.index + 40).trim()}"`); break; }
    }
  }
  assert.deepEqual(hits, [], `banned phrases in built output:\n${hits.join("\n")}`);
});

test("the copy gate catches a hedge in text, in an attribute and split by markup", () => {
  const sample = '<p title="Proposed defaults">x</p><p>by <b>design</b></p><p>Not&nbsp;yet built</p>';
  const views = [decode(sample).replace(/\s+/g, " "), rendered(sample)];
  for (const word of [/\bpropos/i, /\bby design\b/i, /\bnot (yet )?built\b/i]) {
    assert.ok(views.some((v) => word.test(v)), `${word} is caught`);
  }
});

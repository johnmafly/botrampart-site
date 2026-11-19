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

// The banned list (STATE.md, 2026-11-18), matched the way greenhouse's product-voice gate matches it
// (cli/src/check/voice.ts, VOICE_LIST): case-insensitive, whole words, each entry naming its explicit
// forms. Inflected hedges (proposal, proposed, demos, mockups, prototyping...) are listed, not caught by
// a prefix, so "concept" does not match "Concepts" (a docs section), "propos*" does not match
// "proposition" and "demo" does not match "demonstrate".
export const VOICE_LIST = [
  ["by design", ["by design"]],
  ["in design", ["in design"]],
  ["planned", ["planned"]],
  ["plan to", ["plan to", "plans to", "planning to"]],
  ["propos*", ["propose", "proposes", "proposed", "proposing", "proposal", "proposals"]],
  ["hypothetical", ["hypothetical", "hypothetically"]],
  ["concept", ["concept"]],
  ["demo", ["demo", "demos"]],
  ["mockup", ["mockup", "mockups", "mock-up", "mock-ups"]],
  ["prototype", ["prototype", "prototypes", "prototyped", "prototyping"]],
  ["roadmap", ["roadmap", "roadmaps", "road-map", "road-maps"]],
  ["coming soon", ["coming soon"]],
  ["not built", ["not built", "not yet built"]],
  ["not for sale", ["not for sale"]],
  ["nothing is for sale", ["nothing is for sale"]],
  ["for sale yet", ["for sale yet"]],
  ["illustrative", ["illustrative", "illustratively"]],
  ["not a real", ["not a real"]],
  ["first build", ["first build"]],
  ["come later", ["come later", "comes later"]],
  ["ships later", ["ship later", "ships later"]],
  ["architecture plan", ["architecture plan", "architecture plans"]],
  ["placeholder copy", ["placeholder copy"]],
  // Decision 0008, rule 1 (vision-first): every feature is shown working, no waiting for results.
  ["coming next", ["coming next"]],
  ["not available yet", ["not available yet", "not yet available"]],
  ["not measured yet", ["not measured yet", "not yet measured"]],
  ["results pending", ["results pending", "result pending", "pending results"]],
  ["until results land", ["until results land", "until the results land"]],
  ["waiting for results", ["waiting for results", "waiting for the results", "awaiting results"]],
];
// Decision 0008, rule 2: "Get a demo" is one of the two calls to action on every page, so this exact
// phrase is exempt from the "demo" entry (as in greenhouse's VOICE_EXEMPT); "Book a demo" still fails.
export const VOICE_EXEMPT = ["get a demo"];
const EXEMPT_RE = new RegExp(`\\b(?:${VOICE_EXEMPT.map((f) => f.replace(/ /g, "\\s+")).join("|")})\\b`, "gi");
const unexempt = (t) => t.replace(EXEMPT_RE, (m) => " ".repeat(m.length));
const formRe = (forms) => new RegExp(`\\b(?:${[...forms].sort((a, b) => b.length - a.length)
  .map((f) => f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+")).join("|")})\\b`, "i");
export const BANNED = VOICE_LIST.map(([, forms]) => formRe(forms));
const hedged = (text) => BANNED.some((re) => re.test(unexempt(text)));

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
    const views = (f.endsWith(".html") ? [decode(raw).replace(/\s+/g, " "), rendered(raw)] : [raw.replace(/\s+/g, " ")]).map(unexempt);
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
  for (const word of [BANNED[4], BANNED[0], BANNED[12]]) {
    assert.ok(views.some((v) => word.test(v)), `${word} is caught`);
  }
});

test("the copy gate matches whole words: a Concepts heading passes, a concept still fails", () => {
  const heading = '<h2 id="concepts">Concepts</h2>';
  for (const v of [decode(heading), rendered(heading)]) assert.ok(!hedged(v), `passes: ${v}`);
  for (const ok of ["Overview and concepts", "Core concepts", "Our value proposition is simple.",
    "We demonstrate it below.", "Get a demo", "GET A DEMO →", "Designed for platform teams.", "The Team plan includes SSO.", "Plans and pricing"]) {
    assert.ok(!hedged(ok), `passes: ${ok}`);
  }
  for (const bad of ["This is a concept", "BotRampart is a concept.", "The proposal covers three tiers.",
    "Under the proposed pricing", "Book a DEMO", "Two demos", "See the mockup", "the mock-ups below",
    "This prototype runs locally.", "We plan to add SSO.", "It is planning to ship", "It is not yet built.",
    "Exports come later.", "Illustratively", "Book a demo", "Request a demo", "Results pending", "not yet measured"]) {
    assert.ok(hedged(bad), `fails: ${bad}`);
  }
});

test("every banned entry fails on each of its explicit forms", () => {
  for (const [label, forms] of VOICE_LIST) for (const f of forms) {
    assert.ok(hedged(`It is ${f} here.`), `${label}: "${f}" is caught`);
    assert.ok(hedged(`It is ${f.toUpperCase()} here.`), `${label}: "${f}" is caught in capitals`);
  }
});

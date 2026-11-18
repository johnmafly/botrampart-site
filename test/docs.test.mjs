// The user guide at /docs/: every page in HTML and Markdown, llms.txt and llms-full.txt, stable
// anchors, an API reference that matches spec/openapi.yaml, code samples that match the spec, and
// links that resolve.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createRequire } from "node:module";
import { homedir } from "node:os";
import { parseYaml } from "../scripts/yaml.mjs";
import { listPages, operations, renderApiReference, fields, opAnchor, schemaAnchor, SITE_URL, slug } from "../scripts/docs.mjs";
import { builtAnchors, recordedAnchors } from "../scripts/docs-anchors.mjs";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
if (!existsSync(join(dist, "docs", "index.html"))) {
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });
}
const specText = readFileSync(join(root, "spec", "openapi.yaml"), "utf8");
const spec = parseYaml(specText);
const pages = listPages(join(root, "site", "docs"));
const html = (route) => readFileSync(join(dist, route, "index.html"), "utf8");
const text = (path) => readFileSync(join(dist, path), "utf8");
const SECTIONS = ["overview", "architecture", "features", "getting-started", "configuration", "integrations", "api", "sdk", "policy", "self-hosting", "security", "faq", "changelog"];

test("the guide has a landing page and all thirteen sections, in order", () => {
  assert.deepEqual(pages.map((p) => p.slug), ["index", ...SECTIONS]);
  for (const p of pages) {
    assert.ok(existsSync(join(dist, p.route, "index.html")), `${p.route} is built`);
    assert.ok(existsSync(join(dist, p.md)), `${p.md} is built`);
  }
});

test("every docs page links to its Markdown, and the Markdown is the page's text", () => {
  for (const p of pages) {
    const page = html(p.route);
    assert.ok(page.includes(`<link rel="alternate" type="text/markdown" href="${p.md}"`), `${p.route}: alternate link`);
    assert.ok(page.includes(`<a href="${p.md}">`), `${p.route}: visible Markdown link`);
    const md = text(p.md);
    assert.ok(md.includes(`# ${p.meta.title}\n`), `${p.md}: title`);
    assert.doesNotMatch(md, /^---\n/, `${p.md}: no front matter`);
    assert.doesNotMatch(md, /<!-- @|\{\{c:/, `${p.md}: unresolved marker or citation`);
    // Every heading in the HTML is in the Markdown, with the same id.
    for (const [, id] of page.matchAll(/<h[2-4] id="([^"]+)"/g)) {
      if (id === "sources-h") continue;
      // A card's title takes its id from its link (#card-docs-overview); the Markdown has that link as a list item.
      if (id.startsWith("card-")) {
        const href = page.match(new RegExp(`<a class="card" href="([^"]+)">(?:(?!</a>).)*<h3 id="${id}"`))?.[1];
        assert.ok(href && md.includes(`](${href})`), `${p.md}: card #${id} links ${href}`);
        continue;
      }
      assert.ok(md.includes(`{#${id}}`), `${p.md}: heading #${id}`);
    }
    // Every cited source on the HTML page is listed in the Markdown.
    for (const [, href] of page.matchAll(/<li id="src-\d+"><a href="([^"]+)"/g)) assert.ok(md.includes(href.replace(/&amp;/g, "&")), `${p.md}: source ${href}`);
  }
});

test("Markdown and llms files are served as UTF-8 text", () => {
  const headers = text("_headers");
  for (const p of pages) assert.match(headers, new RegExp(`^${p.md.replace(/\./g, "\\.")}\\n  Content-Type: text/markdown; charset=utf-8$`, "m"), p.md);
  for (const f of ["/llms.txt", "/llms-full.txt"]) assert.match(headers, new RegExp(`^${f.replace(/\./g, "\\.")}\\n  Content-Type: text/plain; charset=utf-8$`, "m"), f);
});

test("llms.txt indexes every docs page by its Markdown address; llms-full.txt has the whole guide", () => {
  const llms = text("llms.txt");
  assert.match(llms, /^# BotRampart\n\n> /, "llms.txt starts with a title and a summary");
  for (const p of pages) assert.ok(llms.includes(`(${SITE_URL}${p.md}): `), `llms.txt lists ${p.md}`);
  assert.ok(llms.includes(`${SITE_URL}/llms-full.txt`) && llms.includes(`${SITE_URL}/spec/openapi.yaml`));
  const full = text("llms-full.txt");
  for (const p of pages) {
    const md = text(p.md).replace(/^<!--[^\n]*-->\n\n/, "").trim();
    assert.ok(full.includes(md), `llms-full.txt carries all of ${p.md}`);
  }
});

test("published anchors never disappear, and every new heading is recorded", () => {
  const built = builtAnchors();
  const recorded = recordedAnchors();
  assert.ok(recorded.length >= 100, `anchors are recorded (${recorded.length})`);
  const missing = recorded.filter((a) => !built.includes(a));
  assert.deepEqual(missing, [], "published anchors disappeared (links into the guide would break)");
  const added = built.filter((a) => !recorded.includes(a));
  assert.deepEqual(added, [], "new anchors are not recorded yet: run npm run build && npm run docs:anchors");
  // Every heading on a docs page has an explicit id (the renderer refuses one without).
  for (const p of pages) assert.doesNotMatch(html(p.route).match(/<article[\s\S]*<\/article>/)[0].replace(/<div class="cards">[\s\S]*?<\/div>/g, ""), /<h[2-4](?![^>]*\bid=)[^>]*>/, `${p.route}: heading without id (outside link cards)`);
});

test("links and anchors inside the guide resolve, in HTML and in Markdown", () => {
  const ids = (route) => new Set([...html(route).matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
  const check = (from, href) => {
    const [path, hash] = href.split("#");
    const target = path || from;
    if (!target.startsWith("/")) return;
    const file = target.endsWith("/") ? join(dist, target, "index.html") : join(dist, target);
    assert.ok(existsSync(file), `${from} links to missing ${href}`);
    if (hash && target.endsWith("/")) assert.ok(ids(target).has(hash), `${from} links to missing anchor ${href}`);
  };
  for (const p of pages) {
    for (const [, href] of html(p.route).matchAll(/href="(\/[^"]*|#[^"]*)"/g)) check(p.route, href);
    for (const [, href] of text(p.md).matchAll(/\]\((\/[^)\s]*|#[^)\s]*)\)/g)) check(p.route, href);
  }
});

test("the API reference is generated from the current spec", () => {
  const md = text("/docs/api.md");
  assert.ok(md.includes(renderApiReference(spec)), "dist/docs/api.md carries the reference generated from spec/openapi.yaml (rebuild)");
  const page = html("/docs/api/");
  assert.ok(page.includes(`version <code>${spec.info.version}</code>`), "states the spec version");
  // A change to the spec shows up in the reference: the generator does not drop what it does not know.
  const changed = structuredClone(spec);
  changed.components.schemas.Problem.properties.drift_canary = { type: "string", description: "Canary field." };
  assert.ok(renderApiReference(changed).includes("`drift_canary`"), "a new spec field reaches the reference");
});

test("every operation, parameter, response, schema field, header and scheme in the spec is in the rendered reference", () => {
  const page = html("/docs/api/");
  const section = (id) => {
    const start = page.indexOf(` id="${id}"`);
    assert.ok(start > 0, `#${id} is on /docs/api/`);
    const next = page.slice(start + 1).search(/<h[23] id="(op-[A-Za-z]+|schema-|tag-|authentication|headers|parameters|responses|schemas)"/);
    return next < 0 ? page.slice(start) : page.slice(start, start + 1 + next);
  };
  const ops = operations(spec);
  assert.ok(ops.length >= 14, "spec has operations");
  for (const { path, method, op, params } of ops) {
    const s = section(opAnchor(op.operationId));
    assert.ok(s.includes(`${method.toUpperCase()} ${path.replace(/&/g, "&amp;")}`), `${op.operationId}: method and path`);
    for (const p of params) {
      const name = p.$ref ? spec.components.parameters[p.$ref.split("/").pop()].name : p.name;
      assert.ok(s.includes(`<code>${name}</code>`), `${op.operationId}: parameter ${name}`);
    }
    for (const status of Object.keys(op.responses)) assert.ok(s.includes(`<code>${status}</code>`), `${op.operationId}: response ${status}`);
    if (op.requestBody) {
      const rb = op.requestBody.$ref ? spec.components.requestBodies[op.requestBody.$ref.split("/").pop()] : op.requestBody;
      for (const type of Object.keys(rb.content)) assert.ok(s.includes(`<code>${type}</code>`), `${op.operationId}: request ${type}`);
    }
  }
  for (const [name, schema] of Object.entries(spec.components.schemas)) {
    const s = section(schemaAnchor(name));
    for (const f of fields(spec, schema)) assert.ok(s.includes(`<code>${f.name.replace(/&/g, "&amp;")}</code>`), `${name}: field ${f.name}`);
  }
  for (const h of Object.keys(spec.components.headers)) assert.ok(page.includes(`id="header-${slug(h)}"`), `header ${h}`);
  for (const n of Object.keys(spec.components.securitySchemes)) assert.ok(page.includes(`id="security-${slug(n)}"`), `security scheme ${n}`);
  for (const n of Object.keys(spec.components.responses)) assert.ok(page.includes(`id="response-${slug(n)}"`), `response ${n}`);
});

test("the YAML reader matches the reference yaml package on the spec (when that package is installed)", (t) => {
  const candidates = [process.env.YAML_REFERENCE_DIR, join(homedir(), "workspace/botrampart/greenhouse/node_modules"), join(root, "node_modules")].filter(Boolean);
  let YAML = null;
  for (const dir of candidates) {
    try { YAML = createRequire(join(dir, "noop.js"))("yaml"); break; } catch { /* not here */ }
  }
  if (!YAML) return t.skip("the yaml package is not installed nearby; the build's own checks still run");
  for (const file of ["spec/openapi.yaml", "greenhouse.yaml"]) {
    const src = readFileSync(join(root, file), "utf8");
    assert.deepEqual(parseYaml(src), YAML.parse(src, { merge: false }), file);
  }
});

// Names a sample may use with an operation: every property name reachable from the operation's
// parameters, bodies and responses, and every header name.
function namesFor(opId) {
  const { op, params } = operations(spec).find((o) => o.op.operationId === opId);
  const names = new Set(Object.keys(spec.components.headers).map((h) => h.toLowerCase()));
  const seen = new Set();
  const visit = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(visit);
    if (typeof node.$ref === "string") {
      if (seen.has(node.$ref)) return;
      seen.add(node.$ref);
      visit(node.$ref.replace(/^#\//, "").split("/").reduce((o, k) => o?.[k], spec));
    }
    if (node.properties) for (const k of Object.keys(node.properties)) names.add(k);
    if (node.name && node.in) names.add(node.name);
    for (const [k, v] of Object.entries(node)) if (k !== "$ref" && k !== "examples" && k !== "example") visit(v);
  };
  visit(op);
  visit(params);
  return names;
}

const decode = (s) => s.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
const samples = () => pages.filter((p) => p.slug !== "api").flatMap((p) =>
  [...html(p.route).matchAll(/<pre\b[^>]*><code([^>]*)>([\s\S]*?)<\/code><\/pre>/g)].map(([, attrs, body]) => ({ route: p.route, op: attrs.match(/data-op="([^"]+)"/)?.[1], code: decode(body), lang: attrs.match(/language-([a-z]+)/)?.[1] })));

test("guide code samples that call the product name their operation", () => {
  const callsProduct = /\bbr\.[a-z]+\(|\/_br\/|\/v1\/(sync|challenge|keys|ingest|policy|decisions)|@botrampart\//;
  const all = samples();
  assert.ok(all.length >= 20, `guide has code samples (${all.length})`);
  for (const s of all) if (callsProduct.test(s.code)) assert.ok(s.op, `${s.route}: sample calling the product lacks data-op: ${s.code.slice(0, 80)}`);
});

test("guide code samples use only paths and fields the spec defines for their operation", () => {
  const templates = Object.keys(spec.paths).map((p) => new RegExp(`^${p.replace(/\{[^}]+\}/g, "[^/?\\s]+")}$`));
  let checked = 0;
  for (const s of samples().filter((x) => x.op)) {
    for (const [, path] of s.code.matchAll(/(\/(?:_br|v1)\/[A-Za-z0-9_./{}-]*)(?!\*)/g)) {
      const clean = path.replace(/[.,]$/, "");
      assert.ok(templates.some((re) => re.test(clean)) || /^\/_br\/\*$/.test(clean), `${s.route}: ${clean} is not a path in the spec`);
    }
    const names = namesFor(s.op);
    const keys = [...s.code.matchAll(/"([A-Za-z_][\w.]*)"\s*:/g)].map((m) => m[1]);
    if (s.lang === "yaml") for (const [, k] of s.code.matchAll(/(?:^|[{,\s])([a-z_][a-z0-9_]*):\s/gm)) keys.push(k);
    for (const k of keys) {
      checked += 1;
      assert.ok(names.has(k) || names.has(k.toLowerCase()), `${s.route}: field "${k}" in a ${s.op} sample is not defined for ${s.op} in the spec`);
    }
  }
  assert.ok(checked >= 60, `fields checked against the spec (${checked})`);
});

test("diagrams are inline, labelled SVG figures, and the Markdown links their fingerprinted files", () => {
  const page = html("/docs/architecture/");
  const figs = [...page.matchAll(/<figure class="diagram"[^>]*><svg role="img" aria-label="([^"]+)"/g)];
  assert.equal(figs.length, 3, "three diagrams on the architecture page");
  const md = text("/docs/architecture.md");
  for (const name of ["system", "request-path", "five-minute-loop"]) {
    const m = md.match(new RegExp(`\\]\\((/assets/docs/${name}\\.[0-9a-f]{10}\\.svg) "`));
    assert.ok(m && existsSync(join(dist, m[1])), `${name}.svg is linked under its fingerprinted name`);
  }
});

test("the docs nav works without JavaScript on a phone: a native disclosure with every section", () => {
  for (const p of pages) {
    const page = html(p.route);
    const compact = page.match(/<details class="gn-compact">([\s\S]*?)<\/details>/);
    assert.ok(compact, `${p.route}: compact nav`);
    for (const s of SECTIONS) assert.ok(compact[1].includes(`href="/docs/${s}/"`), `${p.route}: compact nav links ${s}`);
    assert.equal((page.match(/aria-current="page"/g) || []).length >= 1, true, `${p.route}: current page marked`);
  }
  assert.match(html("/").replace(/\s+/g, " "), /<a href="\/docs\/"[^>]*>Docs<\/a>/, "the header links the guide");
});

test("no registry install command in the guide or the llms files", () => {
  const install = /\b(npm (i|install|add)|pnpm add|yarn add|npx botrampart|npx br\b|pip install|docker (pull|run)|docker compose up)\b|ghcr\.io\/botrampart/i;
  for (const f of [...pages.map((p) => p.md), "/llms.txt", "/llms-full.txt", ...pages.map((p) => `${p.route}index.html`)]) {
    const m = text(f).match(install);
    assert.equal(m, null, `${f}: registry install command "${m?.[0]}"`);
  }
});

// The user guide at /docs/. Each page is one Markdown file in site/docs/ (site/docs/index.md is
// the landing page). The build turns every file into
//   /docs/<slug>/       an HTML page in the site's design (head, header, footer, citations), and
//   /docs/<slug>.md     the same text as Markdown, for people and agents,
// and writes /llms.txt (an index of every page) and /llms-full.txt (the whole guide as text).
//
// The API reference (site/docs/api.md) carries a <!-- @openapi --> marker that the build expands
// into a reference generated from spec/openapi.yaml, so it cannot be hand-copied out of date.
//
// Markdown dialect (deliberately small; the build fails on what it does not know):
//   front matter     --- title / nav / order / description / lede ---
//   headings         ## Text {#id} and ### Text {#id}: every heading has an explicit, stable id
//   code             ```lang op=operationId cap="Caption"   (op names a spec operation)
//   tables           GFM pipe tables; the first column is a row header; `---:` right-aligns
//   lists            "- " and "1. " items, one level, continuation lines indented
//   callouts         "> " lines
//   figures          ![alt](/assets/docs/x.svg "Caption") on its own line: inlined as SVG in HTML
//   cards            a "<!-- cards -->" line before a list of "[Title](href): text" items
//   inline           `code`, **bold**, *em*, [text](href), {{c:claim-id}} citations
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from "node:fs";
import { join } from "node:path";
import { parseYaml } from "./yaml.mjs";

export const SITE_URL = "https://botrampart.agenthatch.ai";
const MARKER = "<!-- @openapi -->";

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ---------------------------------------------------------------------------------------------
// Pages
// ---------------------------------------------------------------------------------------------

export function readFrontMatter(text, file) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) throw new Error(`${file}: no front matter`);
  const meta = {};
  for (const line of m[1].split("\n")) {
    const kv = line.match(/^([a-z_]+): (.*)$/);
    if (!kv) throw new Error(`${file}: bad front matter line: ${line}`);
    meta[kv[1]] = kv[2].trim();
  }
  for (const k of ["title", "nav", "order", "description", "lede"]) if (!meta[k]) throw new Error(`${file}: front matter needs ${k}`);
  meta.order = Number(meta.order);
  return { meta, body: text.slice(m[0].length) };
}

// All guide pages, in nav order. `dir` is site/docs (source) or dist/docs (copy).
export function listPages(dir) {
  return readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => {
    const slug = f.slice(0, -3);
    const { meta, body } = readFrontMatter(readFileSync(join(dir, f), "utf8"), f);
    const route = slug === "index" ? "/docs/" : `/docs/${slug}/`;
    return { slug, file: f, route, md: slug === "index" ? "/docs/index.md" : `/docs/${slug}.md`, meta, body };
  }).sort((a, b) => a.meta.order - b.meta.order);
}

// Route a docs Markdown source belongs to (for claims.yaml `where`).
export const routeOfDocSource = (file) => (file === "index.md" ? "/docs/" : `/docs/${file.slice(0, -3)}/`);

// ---------------------------------------------------------------------------------------------
// Markdown to HTML
// ---------------------------------------------------------------------------------------------

function inline(s) {
  const slots = [];
  const hold = (html) => `\u0000${slots.push(html) - 1}\u0000`;
  let out = "";
  for (let k = 0; k < s.length;) {
    if (s[k] === "`") {
      const end = s.indexOf("`", k + 1);
      if (end < 0) throw new Error(`unclosed code span: ${s}`);
      out += hold(`<code>${esc(s.slice(k + 1, end))}</code>`);
      k = end + 1;
      continue;
    }
    if (s[k] === "[") {
      const m = s.slice(k).match(/^\[((?:[^\]`]|`[^`]*`)+)\]\(([^)\s]+)\)/);
      if (m) {
        const href = m[2];
        if (!/^(\/|#|https:\/\/|mailto:)/.test(href)) throw new Error(`link must be site-absolute, #anchor or https: ${href}`);
        out += hold(`<a href="${esc(href)}">${inline(m[1])}</a>`);
        k += m[0].length;
        continue;
      }
    }
    out += s[k++];
  }
  out = esc(out)
    .replace(/\*\*([^*]+?)\*\*/g, "<b>$1</b>")
    .replace(/(^|[\s(])\*([^\s*](?:[^*]*?[^\s*])?)\*(?=[\s.,;:)!?]|$)/g, "$1<em>$2</em>");
  return out.replace(/\u0000(\d+)\u0000/g, (_, n) => slots[+n]);
}

function highlight(code, lang) {
  const html = esc(code);
  const line = lang === "js" || lang === "ts" ? /(^|\s)(\/\/.*)$/ : ["yaml", "shell", "nginx", "text", "toml"].includes(lang) ? /(^|\s)(#.*)$/ : null;
  if (!line) return html;
  return html.split("\n").map((l) => l.replace(line, '$1<span class="d">$2</span>')).join("\n");
}

const splitRow = (line) => {
  const cells = [];
  let cur = "", code = false;
  const body = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  for (let k = 0; k < body.length; k++) {
    const ch = body[k];
    if (ch === "\\" && body[k + 1] === "|") { cur += "|"; k++; continue; }
    if (ch === "`") code = !code;
    if (ch === "|" && !code) { cells.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
};

// Returns { html, headings: [{level, id, text}] }. `svg(path)` returns an SVG file's markup.
export function markdownToHtml(md, { svg, ops = new Set(), where = "docs" } = {}) {
  const lines = md.split("\n");
  const html = [];
  const headings = [];
  let i = 0;
  const fail = (msg) => { throw new Error(`${where} line ${i + 1}: ${msg}`); };
  const blank = (l) => /^\s*$/.test(l);
  const startsBlock = (l) => /^(#{1,6} |```|\||> |!\[|<!--|\s*([-*]|\d+\.) )/.test(l);

  while (i < lines.length) {
    const l = lines[i];
    if (blank(l)) { i++; continue; }

    let m;
    if ((m = l.match(/^(#{1,6}) (.*)$/))) {
      const level = m[1].length;
      const h = m[2].match(/^(.*?) \{#([A-Za-z][A-Za-z0-9_-]*)\}$/);
      if (level < 2 || level > 4) fail(`only ##, ### and #### headings in the body: ${l}`);
      if (!h) fail(`heading without an explicit {#id}: ${l}`);
      headings.push({ level, id: h[2], text: h[1] });
      html.push(`<h${level} id="${h[2]}">${inline(h[1])}</h${level}>`);
      i++;
      continue;
    }

    if ((m = l.match(/^```([a-z]*)(.*)$/))) {
      const lang = m[1] || "text";
      const attrs = m[2];
      const op = attrs.match(/\bop=([A-Za-z0-9_]+)/)?.[1];
      const cap = attrs.match(/\bcap="([^"]*)"/)?.[1];
      const body = [];
      i++;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]);
      if (i >= lines.length) fail("unclosed code fence");
      i++;
      if (op && !ops.has(op)) fail(`op=${op} is not an operationId in spec/openapi.yaml`);
      if (cap || op) html.push(`<p class="code-cap"><span>${inline(cap ?? "Example")}</span>${op ? `<a href="/docs/api/#op-${op}">${op}</a>` : ""}</p>`);
      html.push(`<pre><code class="language-${lang}"${op ? ` data-op="${op}"` : ""}>${highlight(body.join("\n"), lang)}</code></pre>`);
      continue;
    }

    if (l.startsWith("|")) {
      const head = splitRow(l);
      const sep = lines[i + 1] ?? "";
      if (!/^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/.test(sep)) fail("table without a separator row");
      const align = splitRow(sep).map((c) => (/-:$/.test(c) ? ' class="num"' : ""));
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].startsWith("|")) rows.push(splitRow(lines[i++]));
      for (const r of rows) if (r.length !== head.length) fail(`table row has ${r.length} cells, header has ${head.length}`);
      html.push(`<div class="tablewrap" data-cols="${head.length}"><table><thead><tr>${head.map((c, k) => `<th scope="col"${align[k]}>${inline(c)}</th>`).join("")}</tr></thead><tbody>` +
        rows.map((r) => `<tr>${r.map((c, k) => (k === 0 ? `<th scope="row">${inline(c)}</th>` : `<td${align[k]}>${inline(c)}</td>`)).join("")}</tr>`).join("") +
        `</tbody></table></div>`);
      continue;
    }

    if (l.startsWith("> ") || l === ">") {
      const paras = [[]];
      while (i < lines.length && (lines[i].startsWith("> ") || lines[i] === ">")) {
        const t = lines[i++].replace(/^> ?/, "");
        if (blank(t)) paras.push([]); else paras[paras.length - 1].push(t);
      }
      html.push(`<div class="callout">${paras.filter((p) => p.length).map((p) => `<p>${inline(p.join(" "))}</p>`).join("")}</div>`);
      continue;
    }

    if ((m = l.match(/^!\[([^\]]+)\]\((\/assets\/[\w/.-]+\.svg)(?: "([^"]+)")?\)$/))) {
      if (!svg) fail("figure without an SVG loader");
      const markup = svg(m[2]).replace(/<\?xml[^>]*\?>\s*/, "").replace(/<svg\b/, `<svg role="img" aria-label="${esc(m[1])}"`);
      if (/\sid="/.test(markup)) fail(`${m[2]}: inline SVG must not carry id attributes`);
      if (/\sstyle="|<style|<script|href="(?!#)/.test(markup)) fail(`${m[2]}: SVG must be CSP-safe (no style, script or external references)`);
      html.push(`<figure class="diagram" tabindex="0">${markup.trim()}${m[3] ? `<figcaption>${inline(m[3])}</figcaption>` : ""}</figure>`);
      i++;
      continue;
    }

    if (l.startsWith("<!--")) {
      if (l.trim() === "<!-- cards -->") {
        i++;
        while (i < lines.length && blank(lines[i])) i++;
        const cards = [];
        while (i < lines.length && (m = lines[i].match(/^- \[([^\]]+)\]\((\/[^)\s]*)\): (.*)$/))) { cards.push(m); i++; }
        if (!cards.length) fail("cards marker without card items");
        html.push(`<div class="cards">${cards.map(([, t, href, text]) => {
          const label = t.match(/^(\d\d) (.*)$/);
          // A stable anchor per card heading, from the page it links to: /docs/configuration/ -> to-configuration.
          const id = `to-${(href.replace(/[#?].*$/, "").split("/").filter(Boolean).pop() ?? "home").toLowerCase().replace(/[^a-z0-9-]+/g, "-")}`;
          return `<a class="card" href="${esc(href)}">${label ? `<p class="label">${label[1]}</p>` : ""}<h3 id="${id}">${inline(label ? label[2] : t)}</h3><p>${inline(text)}</p></a>`;
        }).join("")}</div>`);
        continue;
      }
      if (l.trim() === "<!-- @openapi -->") { html.push(l.trim()); i++; continue; }
      fail(`unknown comment: ${l}`);
    }

    if ((m = l.match(/^([-*]|\d+\.) /))) {
      const ordered = /\d/.test(m[1]);
      const items = [];
      while (i < lines.length) {
        const im = lines[i].match(/^([-*]|\d+\.) (.*)$/);
        if (im) { items.push([im[2]]); i++; continue; }
        if (!blank(lines[i]) && /^ {2,}\S/.test(lines[i]) && items.length) { items[items.length - 1].push(lines[i].trim()); i++; continue; }
        break;
      }
      const tag = ordered ? "ol" : "ul";
      html.push(`<${tag}>${items.map((it) => `<li>${inline(it.join(" "))}</li>`).join("")}</${tag}>`);
      continue;
    }

    const para = [];
    while (i < lines.length && !blank(lines[i]) && (para.length === 0 || !startsBlock(lines[i]))) para.push(lines[i++].trim());
    html.push(`<p>${inline(para.join(" "))}</p>`);
  }
  return { html: html.join("\n"), headings };
}

// ---------------------------------------------------------------------------------------------
// API reference, generated from the OpenAPI document
// ---------------------------------------------------------------------------------------------

const METHODS = ["get", "put", "post", "delete", "patch", "head", "options"];
export const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const tagAnchor = (name) => `tag-${slug(name)}`;
export const opAnchor = (id) => `op-${id}`;
export const schemaAnchor = (name) => `schema-${name}`;
const refName = (ref) => ref.split("/").pop();
const cell = (s) => String(s ?? "").replace(/\s*\n\s*/g, " ").replace(/\|/g, "\\|").trim();
const codeSpan = (v) => {
  const s = typeof v === "string" ? v : JSON.stringify(v);
  return s.includes("`") ? `\`\` ${s} \`\`` : `\`${s}\``;
};

export function operations(spec) {
  const ops = [];
  for (const [path, item] of Object.entries(spec.paths)) {
    for (const method of METHODS) {
      const op = item[method];
      if (!op) continue;
      ops.push({ path, method, op, servers: op.servers ?? item.servers ?? spec.servers, params: [...(item.parameters ?? []), ...(op.parameters ?? [])] });
    }
  }
  return ops;
}

function resolve(spec, obj) {
  let seen = 0;
  while (obj && obj.$ref) {
    if (++seen > 10) throw new Error(`ref loop at ${obj.$ref}`);
    const parts = obj.$ref.replace(/^#\//, "").split("/");
    obj = parts.reduce((o, k) => o?.[k], spec);
  }
  return obj;
}

function typeOf(s) {
  if (!s) return "any";
  if (s.$ref) return `[\`${refName(s.$ref)}\`](#${schemaAnchor(refName(s.$ref))})`;
  if (s.const !== undefined) return `${codeSpan(s.const)}`;
  if (s.oneOf || s.anyOf) return (s.oneOf ?? s.anyOf).map(typeOf).join(" or ");
  if (s.allOf) return s.allOf.map(typeOf).join(" and ");
  const t = Array.isArray(s.type) ? s.type.join(" or ") : s.type;
  if (t === "array") return `array of ${typeOf(s.items)}`;
  if (t === "object" && s.additionalProperties && typeof s.additionalProperties === "object" && !s.properties) return `map of ${typeOf(s.additionalProperties)}`;
  return t ?? (s.properties ? "object" : "any");
}

function notes(s) {
  if (!s) return "";
  const out = [];
  if (s.description) out.push(s.description.trim());
  if (s.enum) out.push(`One of ${s.enum.map(codeSpan).join(", ")}.`);
  if (s.default !== undefined) out.push(`Default ${codeSpan(s.default)}.`);
  const range = [];
  if (s.minimum !== undefined) range.push(`minimum ${s.minimum}`);
  if (s.maximum !== undefined) range.push(`maximum ${s.maximum}`);
  if (s.minItems !== undefined) range.push(`at least ${s.minItems} items`);
  if (s.maxItems !== undefined) range.push(`at most ${s.maxItems} items`);
  if (s.maxLength !== undefined) range.push(`at most ${s.maxLength} characters`);
  if (range.length) out.push(range.join(", ").replace(/^./, (c) => c.toUpperCase()) + ".");
  if (s.pattern) out.push(`Pattern ${codeSpan(s.pattern)}.`);
  if (s.format) out.push(`Format ${codeSpan(s.format)}.`);
  if (s.readOnly) out.push("Read-only.");
  if (s.examples?.length && !(s.type === "object" && s.properties)) out.push(`Example ${codeSpan(s.examples[0])}.`);
  return out.join(" ");
}

// Flattened fields of an object schema: [{ name, schema, required }]; inline objects nest with dots.
export function fields(spec, schema, prefix = "", depth = 0) {
  const s = schema.$ref ? schema : schema;
  const out = [];
  if (!s || s.$ref || depth > 4) return out;
  const req = new Set(s.required ?? []);
  for (const [name, prop] of Object.entries(s.properties ?? {})) {
    const full = prefix + name;
    out.push({ name: full, schema: prop, required: req.has(name) });
    if (prop.properties && !prop.$ref) out.push(...fields(spec, prop, `${full}.`, depth + 1));
    if (prop.type === "array" && prop.items?.properties && !prop.items.$ref) out.push(...fields(spec, prop.items, `${full}[].`, depth + 1));
  }
  return out;
}

const fieldTable = (spec, schema) => {
  const rows = fields(spec, schema);
  if (!rows.length) return "";
  return ["| Field | Type | Required | Description |", "| --- | --- | --- | --- |",
    ...rows.map((f) => `| \`${f.name}\` | ${cell(typeOf(f.schema))} | ${f.required ? "yes" : "no"} | ${cell(notes(f.schema))} |`)].join("\n");
};

function exampleBlocks(spec, content, lang, op, label) {
  const out = [];
  const add = (summary, value) => {
    const text = typeof value === "string" ? value.replace(/\n$/, "") : JSON.stringify(value, null, 2);
    out.push(`\`\`\`${typeof value === "string" ? lang : "json"} op=${op} cap="${(summary ? `${label}: ${summary}` : label).replace(/"/g, "'")}"\n${text}\n\`\`\``);
  };
  if (content.example !== undefined) add("", content.example);
  for (const raw of Object.values(content.examples ?? {})) { const ex = resolve(spec, raw); add(ex.summary ?? "", ex.value); }
  return out;
}

// Schemas each operation reaches, to give schema examples the data-op of an operation using them.
function schemaUsers(spec) {
  const users = new Map();
  const visit = (node, op, seen) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) { for (const n of node) visit(n, op, seen); return; }
    if (typeof node.$ref === "string" && node.$ref.startsWith("#/components/")) {
      if (seen.has(node.$ref)) return;
      seen.add(node.$ref);
      if (node.$ref.startsWith("#/components/schemas/") && !users.has(refName(node.$ref))) users.set(refName(node.$ref), op);
      visit(resolve(spec, node), op, seen);
    }
    for (const [k, v] of Object.entries(node)) if (k !== "$ref") visit(v, op, seen);
  };
  for (const { op } of operations(spec)) visit(op, op.operationId, new Set());
  return users;
}

function securityText(spec, op) {
  const sec = op.security ?? spec.security ?? [];
  if (!sec.length) return "none";
  return sec.map((r) => Object.keys(r).map((n) => `[\`${n}\`](#security-${slug(n)})`).join(" and ")).join(" or ");
}

export function renderApiReference(spec) {
  const out = [];
  const ops = operations(spec);
  const users = schemaUsers(spec);
  const info = spec.info;
  out.push(`Generated at build time from [spec/openapi.yaml](/spec/openapi.yaml): ${info.title}, version \`${info.version}\`, OpenAPI \`${spec.openapi}\`. ${ops.length} operations, ${Object.keys(spec.components.schemas).length} schemas.`);
  if (info.description) out.push(info.description.trim());

  out.push("## Operations {#operations}");
  out.push(["| Operation | Method and path | Summary | Auth |", "| --- | --- | --- | --- |",
    ...ops.map(({ path, method, op }) => `| [\`${op.operationId}\`](#${opAnchor(op.operationId)}) | \`${method.toUpperCase()} ${path}\` | ${cell(op.summary)} | ${cell(securityText(spec, op))} |`)].join("\n"));

  for (const tag of spec.tags ?? []) {
    const tagged = ops.filter(({ op }) => (op.tags ?? []).includes(tag.name));
    if (!tagged.length) continue;
    out.push(`## ${tag.name} {#${tagAnchor(tag.name)}}`);
    if (tag.description) out.push(tag.description.trim());
    for (const { path, method, op, servers, params } of tagged) {
      out.push(`### \`${method.toUpperCase()} ${path}\` {#${opAnchor(op.operationId)}}`);
      out.push(`**${op.summary ?? op.operationId}.** Operation \`${op.operationId}\`. Server: ${(servers ?? []).map((s) => `\`${s.url}\``).join(", ") || "default"}. Auth: ${securityText(spec, op)}.`);
      if (op.description) out.push(op.description.trim());
      const ps = params.map((p) => resolve(spec, p));
      if (ps.length) {
        out.push(`#### Parameters {#${opAnchor(op.operationId)}-parameters}`);
        out.push(["| Name | In | Type | Required | Description |", "| --- | --- | --- | --- | --- |",
          ...ps.map((p) => `| \`${p.name}\` | ${p.in} | ${cell(typeOf(p.schema))} | ${p.required ? "yes" : "no"} | ${cell([p.description?.trim(), notes({ ...p.schema, description: undefined })].filter(Boolean).join(" "))} |`)].join("\n"));
      }
      if (op.requestBody) {
        const rb = resolve(spec, op.requestBody);
        out.push(`#### Request body {#${opAnchor(op.operationId)}-request}`);
        const lines = [];
        if (rb.description) lines.push(rb.description.trim());
        out.push([...lines, ["| Content type | Schema | Required |", "| --- | --- | --- |",
          ...Object.entries(rb.content).map(([type, c]) => `| \`${type}\` | ${cell(typeOf(c.schema))} | ${rb.required ? "yes" : "no"} |`)].join("\n")].join("\n\n"));
        for (const [type, c] of Object.entries(rb.content)) out.push(...exampleBlocks(spec, c, type.includes("yaml") ? "yaml" : "text", op.operationId, "Request"));
      }
      out.push(`#### Responses {#${opAnchor(op.operationId)}-responses}`);
      const rs = Object.entries(op.responses).map(([status, r]) => [status, resolve(spec, r), r.$ref ? refName(r.$ref) : null]);
      out.push(["| Status | Description | Body | Headers |", "| --- | --- | --- | --- |",
        ...rs.map(([status, r, shared]) => {
          const body = Object.entries(r.content ?? {}).map(([type, c]) => `\`${type}\`: ${typeOf(c.schema)}`).join("; ") || "none";
          const headers = Object.keys(r.headers ?? {}).map((h) => (spec.components.headers?.[h] ? `[\`${h}\`](#header-${slug(h)})` : `\`${h}\``)).join(", ") || "none";
          return `| \`${status}\` | ${cell(r.description)}${shared ? ` (shared response [\`${shared}\`](#response-${slug(shared)}))` : ""} | ${cell(body)} | ${cell(headers)} |`;
        })].join("\n"));
      for (const [status, r, shared] of rs) {
        if (shared || !/^2/.test(status)) continue;
        for (const [type, c] of Object.entries(r.content ?? {})) out.push(...exampleBlocks(spec, c, type.includes("yaml") ? "yaml" : type.includes("javascript") ? "js" : "text", op.operationId, `Response ${status}`));
      }
    }
  }

  const comp = spec.components;
  out.push("## Authentication {#authentication}");
  out.push("Routes under `/_br` take no credentials beyond the first-party session cookie. Core routes use one of these bearer credentials:");
  out.push(["| Scheme | Type | Description |", "| --- | --- | --- |",
    ...Object.entries(comp.securitySchemes ?? {}).map(([n, s]) => `| \`${n}\` | ${s.type}${s.scheme ? ` (${s.scheme})` : ""} | ${cell(s.description)} |`)].join("\n"));
  for (const n of Object.keys(comp.securitySchemes ?? {})) out.push(`### \`${n}\` {#security-${slug(n)}}`, cell(comp.securitySchemes[n].description));

  out.push("## Headers {#headers}");
  for (const [n, h] of Object.entries(comp.headers ?? {})) {
    out.push(`### \`${n}\` {#header-${slug(n)}}`);
    out.push(`${h.description?.trim() ?? ""} Type: ${typeOf(h.schema)}.${h.schema ? ` ${notes({ ...h.schema, description: undefined })}` : ""}`.trim());
  }

  out.push("## Shared parameters {#parameters}");
  for (const [n, p] of Object.entries(comp.parameters ?? {})) {
    out.push(`### \`${n}\` {#parameter-${slug(n)}}`);
    out.push(`\`${p.name}\`, in ${p.in}${p.required ? ", required" : ""}. ${p.description?.trim() ?? ""} Type: ${typeOf(p.schema)}. ${notes({ ...p.schema, description: undefined })}`.trim());
  }

  out.push("## Shared responses {#responses}");
  for (const [n, r] of Object.entries(comp.responses ?? {})) {
    out.push(`### \`${n}\` {#response-${slug(n)}}`);
    out.push(r.description?.trim() ?? "");
    const hs = Object.keys(r.headers ?? {});
    const body = Object.entries(r.content ?? {}).map(([type, c]) => `\`${type}\`: ${typeOf(c.schema)}`).join("; ");
    out.push(`Body: ${body || "none"}. Headers: ${hs.map((h) => (comp.headers?.[h] ? `[\`${h}\`](#header-${slug(h)})` : `\`${h}\``)).join(", ") || "none"}.`);
  }

  out.push("## Schemas {#schemas}");
  for (const [n, s] of Object.entries(comp.schemas)) {
    out.push(`### \`${n}\` {#${schemaAnchor(n)}}`);
    const head = [`Type: ${typeOf({ ...s, description: undefined, examples: undefined })}.`];
    if (s.description) head.push(s.description.trim());
    const extra = notes({ ...s, description: undefined, examples: s.properties ? undefined : s.examples });
    if (extra) head.push(extra);
    out.push(head.join(" "));
    if (s.oneOf || s.anyOf) {
      out.push(["| Variant | Shape |", "| --- | --- |",
        ...(s.oneOf ?? s.anyOf).map((v, k) => `| ${k + 1} | ${cell(v.$ref ? typeOf(v) : v.properties ? `object with ${Object.keys(v.properties).map((p) => `\`${p}\``).join(", ")}${v.required ? `; requires ${v.required.map((p) => `\`${p}\``).join(", ")}` : ""}` : typeOf(v))} |`)].join("\n"));
      for (const v of s.oneOf ?? s.anyOf) if (v.properties) { const t = fieldTable(spec, v); if (t) out.push(t); }
    }
    const t = fieldTable(spec, s);
    if (t) out.push(t);
    if (s.examples?.length && s.properties) {
      const op = users.get(n);
      const v = s.examples[0];
      const text = typeof v === "string" ? v : JSON.stringify(v, null, 2);
      out.push(`\`\`\`json${op ? ` op=${op}` : ""} cap="Example ${n}"\n${text}\n\`\`\``);
    }
  }
  return out.filter((b) => b !== "").join("\n\n");
}

// ---------------------------------------------------------------------------------------------
// Build steps
// ---------------------------------------------------------------------------------------------

const numbered = (n) => String(n).padStart(2, "0");

function guideNav(pages, current, headings) {
  const sections = pages.filter((p) => p.slug !== "index");
  const item = (p, withToc) => {
    const cur = p.slug === current.slug;
    const toc = cur && withToc && headings.length
      ? `<ol class="gn-toc">${headings.filter((h) => h.level === 2).map((h) => `<li><a href="#${h.id}">${inline(h.text)}</a></li>`).join("")}</ol>` : "";
    return `<li><a href="${p.route}"${cur ? ' aria-current="page"' : ""}>${esc(p.meta.nav)}</a>${toc}</li>`;
  };
  const title = `<p class="docnav-title"><a href="/docs/"${current.slug === "index" ? ' aria-current="page"' : ""}>User guide</a></p>`;
  const tail = `<p class="docnav-spec"><a href="${current.md}">This page as Markdown</a></p><p class="docnav-spec"><a href="/llms.txt">llms.txt</a> · <a href="/llms-full.txt">llms-full.txt</a></p>`;
  const where = current.slug === "index" ? "Contents" : `${numbered(current.meta.order)} ${esc(current.meta.nav)}`;
  return `<nav class="docnav guidenav" aria-label="User guide">` +
    `<details class="gn-compact"><summary><span class="gn-k">User guide</span> <span class="gn-where">${where}</span></summary>${title}<ol>${sections.map((p) => item(p, false)).join("")}</ol>${tail}</details>` +
    `<div class="gn-full">${title}<ol>${sections.map((p) => item(p, true)).join("")}</ol>${tail}</div>` +
    `</nav>`;
}

function pager(pages, current) {
  const k = pages.findIndex((p) => p.slug === current.slug);
  const prev = pages[k - 1], next = pages[k + 1];
  if (!prev && !next) return "";
  const link = (p, rel) => p ? `<a class="pager-${rel}" href="${p.route}"><span>${rel === "prev" ? "Previous" : "Next"}</span>${esc(p.meta.title)}</a>` : "<span></span>";
  return `<nav class="pager" aria-label="Previous and next page">${link(prev, "prev")}${link(next, "next")}</nav>`;
}

function pageHtml(pages, page, body, headings) {
  const label = page.slug === "index" ? "Docs · user guide" : `Docs · ${numbered(page.meta.order)} · ${page.meta.nav.toLowerCase()}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <!-- @head | ${page.meta.title} · BotRampart docs | ${page.meta.description} -->
    <link rel="alternate" type="text/markdown" href="${page.md}" title="${esc(page.meta.title)} (Markdown)">
  </head>
  <body>
    <!-- @header -->
    <main id="main">
      <div class="page-head">
        <div class="wrap">
          <p class="label">${esc(label)}</p>
          <h1>${inline(page.meta.title)}</h1>
          <p class="lede">${inline(page.meta.lede)}</p>
        </div>
      </div>
      <div class="wrap doc-grid">
        ${guideNav(pages, page, headings)}
        <article class="prose guide">
          <p class="doc-meta"><a href="${page.md}">Markdown</a><span aria-hidden="true">·</span><a href="/llms.txt">llms.txt</a><span aria-hidden="true">·</span><a href="/spec/openapi.yaml">OpenAPI</a><span aria-hidden="true">·</span><a href="https://github.com/johnmafly/botrampart-site/blob/main/site/docs/${page.file}">Source</a></p>
${body}
          <!-- @sources -->
          ${pager(pages, page)}
        </article>
      </div>
    </main>
    <!-- @footer -->
  </body>
</html>
`;
}

// Step 1, before pages are rendered: write dist/docs/<slug>/index.html for every guide page and
// keep each page's Markdown (front matter removed, API reference expanded) for step 2.
export function buildDocsHtml({ out, root }) {
  const dir = join(out, "docs");
  const spec = parseYaml(readFileSync(join(root, "spec", "openapi.yaml"), "utf8"));
  const ops = new Set(operations(spec).map(({ op }) => op.operationId));
  const pages = listPages(dir);
  const svg = (p) => {
    const f = join(out, p);
    if (!existsSync(f)) throw new Error(`docs figure ${p} not found`);
    return readFileSync(f, "utf8");
  };
  for (const page of pages) {
    let body = page.body;
    if (body.includes(MARKER)) body = body.replace(MARKER, () => renderApiReference(spec));
    page.markdown = body;
    const { html, headings } = markdownToHtml(body, { svg, ops, where: `site/docs/${page.file}` });
    page.headings = headings;
    const ids = new Set();
    for (const h of headings) {
      if (ids.has(h.id)) throw new Error(`site/docs/${page.file}: duplicate heading id ${h.id}`);
      ids.add(h.id);
    }
    // Every id on the page is unique, card headings included.
    const all = new Set();
    for (const [, id] of html.matchAll(/\sid="([^"]+)"/g)) {
      if (all.has(id)) throw new Error(`site/docs/${page.file}: duplicate id ${id}`);
      all.add(id);
    }
    const target = page.slug === "index" ? join(dir, "index.html") : join(dir, page.slug, "index.html");
    mkdirSync(join(target, ".."), { recursive: true });
    writeFileSync(target, pageHtml(pages, page, html, headings));
  }
  return { pages, spec };
}

// Citations in Markdown: {{c:id}} becomes [n] and a Sources list closes the page.
function citeMarkdown(md, claims, where) {
  const order = [];
  md = md.replace(/\{\{c:([a-z0-9-]+)\}\}/g, (_, id) => {
    if (!claims.has(id)) throw new Error(`${where}: unknown claim ${id}`);
    if (!order.includes(id)) order.push(id);
    return `[${order.indexOf(id) + 1}]`;
  });
  if (!order.length) return md;
  return md + "\n\n## Sources {#sources}\n\n" + order.map((id, k) => {
    const c = claims.get(id);
    return `${k + 1}. [${c.source_title || new URL(c.source_url).hostname}](${c.source_url}): "${c.quote}" Checked ${c.checked}.`;
  }).join("\n");
}

// Step 2, after assets are fingerprinted: write /docs/<slug>.md, /llms.txt and /llms-full.txt,
// with asset URLs rewritten to their fingerprinted names, and their content-type rules.
export function buildDocsText({ out, docs, claims, assets, sha }) {
  const { pages, spec } = docs;
  const fix = (text) => text.replace(/\/assets\/[\w/.-]+?\.(?:css|js|mjs|woff2|svg)\b/g, (r) => {
    if (!assets.has(r)) throw new Error(`docs Markdown references missing asset ${r}`);
    return assets.get(r);
  });
  const texts = [];
  for (const page of pages) {
    const body = citeMarkdown(page.markdown.replace(/^<!-- cards -->\n+/gm, ""), claims, page.file).trim();
    // Headings keep their {#id}: the same stable anchors as the HTML page.
    const md = fix(`# ${page.meta.title}\n\n${page.meta.lede}\n\n${body}\n`);
    const header = `<!-- BotRampart user guide · ${SITE_URL}${page.route} · Markdown of ${page.route} -->\n\n`;
    writeFileSync(join(out, page.md), header + md);
    texts.push({ page, md });
  }
  const section = (p) => `- [${p.meta.title}](${SITE_URL}${p.md}): ${p.meta.description}`;
  const llms = `# BotRampart

> Open-source bot defense that prices requests instead of judging visitors. Every session holds credit, every path has a cost, and a challenge buys credit, never a clearance. This file indexes the user guide; every page is also published as Markdown.

The guide covers BotRampart's design and architecture, features, install and configuration, integrations, the HTTP API (generated from the OpenAPI spec, version ${spec.info.version}), the SDKs, the policy file and cohorts, self-hosting, the security model, an FAQ and the changelog. The whole guide as one file: [llms-full.txt](${SITE_URL}/llms-full.txt).

## Guide

${pages.map(section).join("\n")}

## Specification

- [OpenAPI spec (YAML)](${SITE_URL}/spec/openapi.yaml): the wire contract for the SDK routes under /_br and the Core API; the API reference is generated from it.

## Optional

- [The meter](${SITE_URL}/meter/): the mechanism, with every outside figure sourced.
- [The field](${SITE_URL}/field/): how BotRampart compares with other bot defenses.
- [Own it](${SITE_URL}/own/): editions and prices.
- [Every claim, sourced](https://github.com/johnmafly/botrampart-site/blob/main/claims.yaml): the ledger behind each outside figure.
`;
  writeFileSync(join(out, "llms.txt"), llms);
  const full = `# BotRampart user guide (full text)

Source: ${SITE_URL}/docs/ · built from commit ${sha} · ${pages.length} pages · OpenAPI ${spec.info.version}

${texts.map(({ page, md }) => `<!-- page: ${SITE_URL}${page.route} (Markdown: ${SITE_URL}${page.md}) -->\n\n${md.trim()}`).join("\n\n---\n\n")}
`;
  writeFileSync(join(out, "llms-full.txt"), full);
  appendFileSync(join(out, "_headers"), "\n# User guide as text (written by scripts/docs.mjs): Markdown and llms files, UTF-8.\n" +
    [...pages.map((p) => p.md).sort().map((u) => `${u}\n  Content-Type: text/markdown; charset=utf-8\n`),
      "/llms.txt\n  Content-Type: text/plain; charset=utf-8\n", "/llms-full.txt\n  Content-Type: text/plain; charset=utf-8\n"].join("\n"));
  return { pages: pages.length };
}

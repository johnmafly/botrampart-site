// Reads claims.yaml. The file follows greenhouse's schemas/claims.schema.json (each claim has
// exactly id, claim, where, source_url, quote, checked) and is kept in one strict shape, so this
// reader needs no YAML library:
//
//   claims:
//     # source_title: "Link text for the source"
//     # Free-text check notes.
//     - id: "thales-automated"
//       claim: "..."
//       where: ["/", "/docs/comparison/"]
//       source_url: "https://..."
//       ...
//
// Every value is a double-quoted string; `where` is a one-line flow list of them. A
// `# source_title: "..."` comment applies to the next claim and is returned as `source_title`
// (the build's link text); it is not part of the schema. Other comments are ignored.
import { readFileSync } from "node:fs";

export const SCHEMA_FIELDS = ["id", "claim", "where", "source_url", "quote", "checked"];

export function readClaims(path) {
  const claims = [];
  let current = null;
  let title = null;
  for (const [i, raw] of readFileSync(path, "utf8").split("\n").entries()) {
    const line = raw.replace(/\s+$/, "");
    if (!line || line === "claims:") continue;
    const t = line.match(/^  # source_title: (".*")$/);
    if (t) { title = JSON.parse(t[1]); continue; }
    if (line.trimStart().startsWith("#")) continue;
    const m = line.match(/^  (- |  )([a-z_]+): (".*"|\[.*\])$/);
    if (!m) throw new Error(`claims.yaml line ${i + 1}: unexpected shape: ${line}`);
    if (m[1] === "- ") {
      claims.push((current = {}));
      if (title !== null) Object.defineProperty(current, "source_title", { value: title, enumerable: false });
      title = null;
    }
    if (!current) throw new Error(`claims.yaml line ${i + 1}: field before first item`);
    if (!SCHEMA_FIELDS.includes(m[2])) throw new Error(`claims.yaml line ${i + 1}: field ${m[2]} is not in the claims schema`);
    const value = JSON.parse(m[3]);
    if (m[2] === "where" ? !Array.isArray(value) || !value.every((v) => typeof v === "string") : typeof value !== "string") {
      throw new Error(`claims.yaml line ${i + 1}: ${m[2]} has the wrong type`);
    }
    current[m[2]] = value;
  }
  return claims;
}

// Routes that cite each claim, from the {{c:id}} markers in site/**/*.html:
// site/index.html -> /, site/docs/comparison/index.html -> /docs/comparison/.
export function citedRoutes(siteDir, { readdirSync, statSync, join, relative, sep }) {
  const where = new Map();
  const walk = (dir) => {
    for (const name of readdirSync(dir)) {
      const p = join(dir, name);
      if (statSync(p).isDirectory()) { if (name !== "_partials") walk(p); continue; }
      if (!name.endsWith(".html")) continue;
      const rel = relative(siteDir, p).split(sep).join("/");
      const route = rel === "index.html" ? "/" : rel.endsWith("/index.html") ? `/${rel.slice(0, -10)}` : `/${rel}`;
      for (const [, id] of readFileSync(p, "utf8").matchAll(/\{\{c:([a-z0-9-]+)\}\}/g)) {
        if (!where.has(id)) where.set(id, new Set());
        where.get(id).add(route);
      }
    }
  };
  walk(siteDir);
  return new Map([...where].map(([id, routes]) => [id, [...routes].sort()]));
}

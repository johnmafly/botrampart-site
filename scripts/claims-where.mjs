// Writes each claim's `where` in claims.yaml from the pages that cite it ({{c:id}} in site/).
// usage: node scripts/claims-where.mjs          rewrite claims.yaml
//        node scripts/claims-where.mjs --check  exit 1 if any `where` is out of date
import { citedRoutes } from "./claims.mjs";
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const file = join(root, "claims.yaml");
const cited = citedRoutes(join(root, "site"), { readdirSync, statSync, join, relative, sep });
const lines = readFileSync(file, "utf8").split("\n");
let id = null;
const stale = [];
for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(/^  - id: "(.*)"$/);
  if (m) { id = m[1]; continue; }
  if (!/^    where: /.test(lines[i])) continue;
  const routes = cited.get(id);
  if (!routes) throw new Error(`claim ${id} is not cited on any page`);
  const line = `    where: ${JSON.stringify(routes).replace(/","/g, '", "')}`;
  if (line !== lines[i]) { stale.push(id); lines[i] = line; }
}
if (process.argv.includes("--check")) {
  if (stale.length) { console.error(`where is out of date for: ${stale.join(", ")} (run npm run claims:where)`); process.exit(1); }
  console.log("claims.yaml where: up to date");
} else {
  writeFileSync(file, lines.join("\n"));
  console.log(`claims.yaml where: ${stale.length} updated`);
}

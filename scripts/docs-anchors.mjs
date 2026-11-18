// Records every heading anchor the user guide publishes in test/docs-anchors.txt, one
// "<route>#<id>" per line. test/docs.test.mjs fails when a recorded anchor disappears (links into
// the guide would break) or when a new heading is not recorded yet (so it is protected from then on).
// usage: npm run build && node scripts/docs-anchors.mjs          add new anchors to the file
//        node scripts/docs-anchors.mjs --check                   exit 1 if the file is out of date
// Removing an anchor on purpose means deleting its line here and adding a redirect or note.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { listPages } from "./docs.mjs";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
const file = join(root, "test", "docs-anchors.txt");

export function builtAnchors() {
  const out = [];
  for (const p of listPages(join(root, "site", "docs"))) {
    const html = readFileSync(join(dist, p.route, "index.html"), "utf8");
    for (const [, id] of html.matchAll(/<h[2-4] id="([^"]+)"/g)) out.push(`${p.route}#${id}`);
  }
  return out;
}

export function recordedAnchors() {
  return existsSync(file) ? readFileSync(file, "utf8").split("\n").filter((l) => l && !l.startsWith("#")) : [];
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const built = builtAnchors();
  const recorded = recordedAnchors();
  const added = built.filter((a) => !recorded.includes(a));
  const missing = recorded.filter((a) => !built.includes(a));
  if (process.argv.includes("--check")) {
    if (added.length || missing.length) {
      console.error(`docs anchors out of date: ${added.length} new, ${missing.length} missing\n${missing.map((a) => `missing: ${a}`).join("\n")}`);
      process.exit(1);
    }
    console.log(`docs anchors: ${recorded.length} recorded, all present`);
  } else {
    if (missing.length) console.warn(`not removed (still recorded, and now missing):\n${missing.join("\n")}`);
    const header = "# Published heading anchors of the user guide (/docs/). One <route>#<id> per line.\n# test/docs.test.mjs fails if any of these disappears. Add new ones with: npm run docs:anchors\n";
    writeFileSync(file, header + [...recorded, ...added].join("\n") + "\n");
    console.log(`docs anchors: ${added.length} added, ${recorded.length + added.length} recorded`);
  }
}

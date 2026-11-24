// What runs today (audit #3): the quickstart's try-budget snippet, as the built site publishes it,
// runs and prints the output the page documents. The build used to rename the import inside the
// code sample to economics.<hash>.mjs, which no clone has; it now leaves repository paths in code
// samples and GitHub links alone. This extracts the snippet and its output from the built page, its
// Markdown twin and llms-full.txt, runs it from the repository root as a reader would, and runs it
// again against the built (fingerprinted) file the site serves.
import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import { TRY_BUDGET, TRY_BUDGET_OUTPUT } from "../site/assets/ai-install.js";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
if (!existsSync(join(dist, "index.html"))) {
  execFileSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });
}
const decode = (s) => s.replace(/<[^>]+>/g, "").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
const page = readFileSync(join(dist, "docs", "getting-started", "index.html"), "utf8");
// The code block titled try-budget.mjs, and the one titled Output right after it.
const block = (title) => {
  const at = page.indexOf(`<span class="code-title">${title}</span>`);
  assert.ok(at > 0, `the quickstart has a code block titled ${title}`);
  return decode(page.slice(at).match(/<code[^>]*>([\s\S]*?)<\/code>/)[1]);
};
const snippet = block("try-budget.mjs");
const documented = block("Output");
const run = (code, cwd) => {
  const file = join(cwd, `try-budget-${process.pid}.mjs`);
  writeFileSync(file, code);
  try {
    return execFileSync(process.execPath, [file], { cwd, encoding: "utf8" }).trim();
  } finally {
    rmSync(file, { force: true });
  }
};

test("the published snippet imports the repository's file by its own name", () => {
  const imp = snippet.match(/from "(\.\/[^"]+)"/)?.[1];
  assert.equal(imp, "./site/assets/economics.mjs");
  assert.ok(existsSync(join(root, imp)), `${imp} exists in a clone`);
  for (const text of [readFileSync(join(dist, "docs", "getting-started.md"), "utf8"), readFileSync(join(dist, "llms-full.txt"), "utf8")]) {
    assert.ok(text.includes(TRY_BUDGET), "the Markdown twin and llms-full.txt carry the same snippet");
  }
  assert.equal(snippet, TRY_BUDGET, "the Autoinstall prompt carries the snippet the quickstart publishes");
  assert.equal(documented, TRY_BUDGET_OUTPUT, "and the output it documents");
});

test("the published snippet, run from the repository root, prints the documented output", () => {
  assert.equal(run(snippet, root), documented);
});

test("the same snippet against the built file the site serves prints the same output", () => {
  const built = readdirSync(join(dist, "assets")).find((f) => /^economics\.[0-9a-f]{10}\.mjs$/.test(f));
  assert.ok(built, "the site serves economics.<hash>.mjs");
  assert.equal(readFileSync(join(dist, "assets", built), "utf8"), readFileSync(join(root, "site", "assets", "economics.mjs"), "utf8"), "the served file is the repository's file");
  const dir = mkdtempSync(join(tmpdir(), "try-budget-"));
  try {
    writeFileSync(join(dir, built), readFileSync(join(dist, "assets", built)));
    assert.equal(run(snippet.replace("./site/assets/economics.mjs", `./${built}`), dir), documented);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("every GitHub link to a file in this repository names a file that exists", () => {
  const walk = (dir) => readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? walk(p) : /\.(?:html|md|txt)$/.test(n) ? [p] : [];
  });
  let n = 0;
  for (const f of walk(dist)) {
    for (const [, path] of readFileSync(f, "utf8").matchAll(/https:\/\/github\.com\/johnmafly\/botrampart-site\/blob\/main\/([\w/.-]+)/g)) {
      n += 1;
      assert.ok(existsSync(join(root, path)), `${relative(dist, f)}: ${path} is not in the repository`);
    }
  }
  assert.ok(n >= 3, `GitHub file links checked (${n})`);
});

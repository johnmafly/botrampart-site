// Builds the static site into dist/ and writes /.well-known/greenhouse.json
// (Greenhouse package contract v1). No dependencies.
import { cpSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";

const SLUG = "botrampart";
const root = new URL("..", import.meta.url).pathname;
const src = join(root, "site");
const out = join(root, "dist");

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

rmSync(out, { recursive: true, force: true });
cpSync(src, out, { recursive: true });
mkdirSync(join(out, ".well-known"), { recursive: true });
const info = { slug: SLUG, sha, built_at: new Date().toISOString() };
writeFileSync(join(out, ".well-known", "greenhouse.json"), JSON.stringify(info, null, 2) + "\n");
console.log(`dist/ built for ${SLUG} at ${sha}`);

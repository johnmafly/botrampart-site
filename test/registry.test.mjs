// Registry gate: the site shows an install command only for a package or image that is published.
// It scans everything the site serves (HTML as rendered text, JS, modules, YAML, TXT, JSON) for
// registry install commands (npx, npm/pnpm/yarn/bun add or install, pip install, docker pull/run,
// a container `image:` reference, go/cargo/brew/gem install, helm install) and fails when:
//   1. a command names a package or image that claims.yaml does not list as published, or
//   2. a listed package or image is not actually on its registry (checked online).
// "Listed as published" means a claim whose id starts with "published-" and whose source_url is the
// package's own registry page (npmjs.com/package/<name>, pypi.org/project/<name>/,
// hub.docker.com/r/<ns>/<repo>, github.com/<owner>/<repo>/pkgs/container/<name>, crates.io/crates/<name>,
// formulae.brew.sh/formula/<name>, pkg.go.dev/<module>). Today no BotRampart package is published,
// so the site carries no install command at all.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { readClaims } from "../scripts/claims.mjs";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
if (!existsSync(join(dist, "index.html"))) {
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });
}

const BINARY = /\.(woff2?|png|jpe?g|gif|webp|avif|ico)$/i;
const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : BINARY.test(p) ? [] : [p];
});
const decode = (s) => s
  .replace(/&nbsp;|&#160;/gi, " ").replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n))
  .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
// HTML as rendered text, line breaks kept so a command is read one line at a time.
const rendered = (html) => decode(html.replace(/<[^>]+>/g, ""));

const NAME = String.raw`@?[a-z0-9][\w.-]*(?:\/[\w.-]+)?`;
const stripVersion = (n) => n.replace(/^(@?[^@]+)@.*$/, "$1");
const args = (rest) => rest.trim().split(/\s+/).filter((t) => t && !t.startsWith("-") && /^@?[a-z0-9]/i.test(t));
// Docker flags that take a separate value, so the value is not read as the image.
const DOCKER_VALUE_FLAGS = new Set(["-p", "--publish", "-e", "--env", "--env-file", "-v", "--volume", "--name", "--network",
  "-w", "--workdir", "--entrypoint", "-u", "--user", "--platform", "-l", "--label", "--mount", "-m", "--memory"]);

// Normalize an image reference to a registry key: ghcr:<owner>/<name>, dockerhub:<ns>/<repo>, or <host>:<path>.
export function imageKey(ref) {
  const noTag = ref.replace(/@sha256:.*$/, "").replace(/:(?=[^/]*$).*$/, "");
  const parts = noTag.split("/");
  if (parts.length > 1 && /[.:]/.test(parts[0]) || parts[0] === "localhost") {
    const host = parts.shift();
    if (host === "ghcr.io") return `ghcr:${parts.join("/")}`;
    if (host === "docker.io" || host === "registry-1.docker.io") return `dockerhub:${parts.length === 1 ? "library/" : ""}${parts.join("/")}`;
    return `${host}:${parts.join("/")}`;
  }
  return `dockerhub:${parts.length === 1 ? "library/" : ""}${parts.join("/")}`;
}

// Every registry install command in a text, as { key, command }. key is "<registry>:<name>".
export function findInstallCommands(text) {
  const found = [];
  const add = (registry, name, command) => found.push({ key: `${registry}:${name}`, command: command.trim() });
  for (const line of text.split(/\r?\n|\\n|;|&&|\|\|/)) {
    let m;
    const runRe = new RegExp(String.raw`\b(?:npx|bunx|pnpm\s+dlx|yarn\s+dlx|npm\s+exec)\s+(?:-{1,2}[\w-]+(?:=\S+)?\s+)*(${NAME}(?:@\S+)?)`, "gi");
    while ((m = runRe.exec(line))) add("npm", stripVersion(m[1]), m[0]);
    const addRe = /\b(?:npm\s+(?:i|install|add)|pnpm\s+(?:add|i|install)|yarn\s+(?:global\s+)?add|bun\s+(?:add|i|install))\b([^`"'|<>]*)/gi;
    while ((m = addRe.exec(line))) for (const a of args(m[1])) add("npm", stripVersion(a), m[0]);
    const pipRe = /\b(?:pip3?\s+install|python3?\s+-m\s+pip\s+install|uv\s+pip\s+install|uv\s+add|pipx\s+install|poetry\s+add)\b([^`"'|<>]*)/gi;
    while ((m = pipRe.exec(line))) for (const a of args(m[1])) add("pypi", a.replace(/[<>=!~\[].*$/, "").toLowerCase(), m[0]);
    const dockerRe = /\b(?:docker|podman|nerdctl)\s+(?:image\s+)?(pull|run|create)\b([^`"'|<>]*)/gi;
    while ((m = dockerRe.exec(line))) {
      const toks = m[2].trim().split(/\s+/).filter(Boolean);
      for (let i = 0; i < toks.length; i++) {
        if (toks[i].startsWith("-")) { if (!toks[i].includes("=") && DOCKER_VALUE_FLAGS.has(toks[i])) i++; continue; }
        if (/^[\w.\/:@-]+$/.test(toks[i])) add(...imageKey(toks[i]).split(/:(.*)/s).slice(0, 2), m[0]);
        break;
      }
    }
    const imageRe = /^\s*-?\s*image:\s*["']?([\w.\/:@-]+)/gi;
    while ((m = imageRe.exec(line))) add(...imageKey(m[1]).split(/:(.*)/s).slice(0, 2), m[0]);
    const goRe = /\bgo\s+(?:install|get)\s+([\w.\/-]+)/gi;
    while ((m = goRe.exec(line))) add("go", m[1].replace(/@.*$/, ""), m[0]);
    const cargoRe = /\bcargo\s+(?:install|add)\b([^`"'|<>]*)/gi;
    while ((m = cargoRe.exec(line))) for (const a of args(m[1])) add("crates", a.replace(/@.*$/, ""), m[0]);
    const brewRe = /\bbrew\s+install\b([^`"'|<>]*)/gi;
    while ((m = brewRe.exec(line))) for (const a of args(m[1])) add("brew", a, m[0]);
    const gemRe = /\bgem\s+install\b([^`"'|<>]*)/gi;
    while ((m = gemRe.exec(line))) for (const a of args(m[1])) add("rubygems", a, m[0]);
    const helmRe = /\bhelm\s+(?:install|upgrade\s+--install)\s+\S+\s+([\w.\/:-]+)/gi;
    while ((m = helmRe.exec(line))) add("helm", m[1], m[0]);
  }
  return found;
}

// The registry key a "published-" claim's source_url names, or null.
export function keyFromRegistryUrl(url) {
  const u = new URL(url);
  const path = decodeURIComponent(u.pathname).replace(/\/+$/, "");
  let m;
  if (u.hostname === "www.npmjs.com" && (m = path.match(/^\/package\/(@[^/]+\/[^/]+|[^/@]+)$/))) return `npm:${m[1]}`;
  if (u.hostname === "pypi.org" && (m = path.match(/^\/project\/([^/]+)$/))) return `pypi:${m[1].toLowerCase()}`;
  if (u.hostname === "hub.docker.com" && (m = path.match(/^\/r\/([^/]+\/[^/]+)$/))) return `dockerhub:${m[1]}`;
  if (u.hostname === "hub.docker.com" && (m = path.match(/^\/_\/([^/]+)$/))) return `dockerhub:library/${m[1]}`;
  if (u.hostname === "github.com" && (m = path.match(/^\/([^/]+)\/[^/]+\/pkgs\/container\/(.+)$/))) return `ghcr:${m[1]}/${m[2]}`.toLowerCase();
  if (u.hostname === "crates.io" && (m = path.match(/^\/crates\/([^/]+)$/))) return `crates:${m[1]}`;
  if (u.hostname === "formulae.brew.sh" && (m = path.match(/^\/formula\/([^/]+)$/))) return `brew:${m[1]}`;
  if (u.hostname === "pkg.go.dev" && (m = path.match(/^\/(.+)$/))) return `go:${m[1]}`;
  return null;
}

// Whether the registry has the package or image. Throws when the registry cannot be reached.
export async function registryHas(key) {
  const [registry, name] = key.split(/:(.*)/s);
  const status = async (url, init) => (await fetch(url, { ...init, signal: AbortSignal.timeout(20000) })).status;
  const verdict = (code, url) => {
    if (code === 200) return true;
    if ([401, 403, 404, 410].includes(code)) return false;
    throw new Error(`${url} answered HTTP ${code}`);
  };
  switch (registry) {
    case "npm": { const url = `https://registry.npmjs.org/${name.replace("/", "%2f")}`; return verdict(await status(url), url); }
    case "pypi": { const url = `https://pypi.org/pypi/${name}/json`; return verdict(await status(url), url); }
    case "dockerhub": { const url = `https://hub.docker.com/v2/repositories/${name}/`; return verdict(await status(url), url); }
    case "crates": { const url = `https://crates.io/api/v1/crates/${name}`; return verdict(await status(url, { headers: { "user-agent": "botrampart-site registry test" } }), url); }
    case "brew": { const url = `https://formulae.brew.sh/api/formula/${name}.json`; return verdict(await status(url), url); }
    case "go": { const url = `https://proxy.golang.org/${name.toLowerCase()}/@latest`; return verdict(await status(url), url); }
    case "ghcr": {
      const tokenUrl = `https://ghcr.io/token?scope=repository:${name}:pull`;
      const tr = await fetch(tokenUrl, { signal: AbortSignal.timeout(20000) });
      if (tr.status !== 200) return verdict(tr.status, tokenUrl);
      const { token } = await tr.json();
      const url = `https://ghcr.io/v2/${name}/tags/list`;
      return verdict(await status(url, { headers: { authorization: `Bearer ${token}` } }), url);
    }
    default: throw new Error(`no registry check for ${key}: publish it on a supported registry or remove the command`);
  }
}

const published = new Map(readClaims(join(root, "claims.yaml"))
  .filter((c) => c.id.startsWith("published-"))
  .map((c) => [keyFromRegistryUrl(c.source_url), c.id]));

const served = walk(dist).flatMap((f) => {
  const raw = readFileSync(f, "utf8");
  const text = f.endsWith(".html") ? rendered(raw) : raw;
  return findInstallCommands(text).map((c) => ({ ...c, file: relative(dist, f) }));
});

test("every published- claim names a registry page", () => {
  assert.ok(!published.has(null), "a published- claim's source_url is not a supported registry page");
});

test("every install command the site serves names a package or image listed as published in claims.yaml", () => {
  const unlisted = served.filter((c) => !published.has(c.key)).map((c) => `${c.file}: ${c.key} (${c.command})`);
  assert.deepEqual(unlisted, [], `install commands for packages not listed as published in claims.yaml:\n${unlisted.join("\n")}`);
});

test("every package the site's install commands name is on its registry", async () => {
  const keys = [...new Set(served.map((c) => c.key))];
  const missing = [];
  for (const k of keys) if (!(await registryHas(k))) missing.push(k);
  assert.deepEqual(missing, [], `the registry does not have: ${missing.join(", ")}`);
});

test("the detector reads the install commands the site used to carry, and leaves ordinary code alone", () => {
  const old = [
    "$ npx botrampart init",
    "$ npx br doctor",
    "    image: ghcr.io/botrampart/core:1",
    "$ docker compose up -d core",
    "npm i @botrampart/node express",
    "docker run -p 8787:8787 --rm botrampart/core:1",
    "pip install botrampart==0.1",
  ].join("\n");
  assert.deepEqual(findInstallCommands(old).map((c) => c.key), [
    "npm:botrampart", "npm:br", "ghcr:botrampart/core", "npm:@botrampart/node", "npm:express", "dockerhub:botrampart/core", "pypi:botrampart",
  ]);
  const ordinary = 'import { botrampart } from "@botrampart/node";\ncurl -X POST "http://localhost:8787/v1/policy/simulate"\nnpm test\nnpm run build';
  assert.deepEqual(findInstallCommands(ordinary), []);
  assert.equal(keyFromRegistryUrl("https://www.npmjs.com/package/@botrampart/node"), "npm:@botrampart/node");
  assert.equal(keyFromRegistryUrl("https://github.com/botrampart/core/pkgs/container/core"), "ghcr:botrampart/core");
});

test("the registry check tells a published package from an absent one", async () => {
  assert.equal(await registryHas("npm:express"), true);
  assert.equal(await registryHas("npm:@botrampart/node"), false);
  assert.equal(await registryHas("npm:botrampart"), false);
  assert.equal(await registryHas("ghcr:botrampart/core"), false);
  assert.equal(await registryHas("dockerhub:botrampart/core"), false);
});

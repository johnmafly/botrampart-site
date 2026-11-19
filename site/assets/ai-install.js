// Express AI install: builds a prompt for an AI coding agent from the stack picked on /build/ai/.
// Client-side only: no network requests, no cookies, no storage. The page carries the default
// prompt in its HTML (readable without JavaScript); this module regenerates it on every change.
// buildPrompt() is pure and exported, so a test can check the HTML default matches it.

const SITE = "https://botrampart.agenthatch.ai";

export const OPTIONS = {
  framework: [
    { value: "express", label: "Express", available: true },
    { value: "fastify", label: "Fastify", available: true },
    { value: "next", label: "Next.js", available: true },
    { value: "django", label: "Django", available: false },
    { value: "rails", label: "Rails", available: false },
    { value: "laravel", label: "Laravel", available: false },
    { value: "spring", label: "Spring", available: false },
    { value: "go", label: "Go", available: false },
  ],
  integration: [
    { value: "sdk", label: "Node backend SDK, in the app", available: true },
    { value: "nginx", label: "nginx module, in nginx or ingress-nginx", short: "nginx module", available: false },
    { value: "worker", label: "Cloudflare Worker in my own Cloudflare account", short: "Cloudflare Worker", available: false },
    { value: "cloudfront", label: "CloudFront with Lambda@Edge in my own AWS account", short: "CloudFront", available: false },
  ],
  core: [
    { value: "workers", label: "Cloudflare Workers", available: true },
    { value: "docker", label: "Docker, one container", available: true },
    { value: "kubernetes", label: "Kubernetes", available: true },
  ],
  bucket: [
    { value: "r2", label: "Cloudflare R2", available: true },
    { value: "s3", label: "Amazon S3", available: true },
    { value: "minio", label: "MinIO", available: true },
    { value: "gcs", label: "Google Cloud Storage", available: true },
    { value: "azure", label: "Azure Blob Storage", available: true },
  ],
  model: [
    { value: "off", label: "Off", available: true },
    { value: "gemini", label: "Gemini Decision 1", available: true },
    { value: "local", label: "A self-hosted model", available: true },
  ],
  agent: [
    { value: "claude", label: "Claude Code", available: true },
    { value: "cursor", label: "Cursor", available: true },
    { value: "codex", label: "Codex", available: true },
    { value: "generic", label: "Any coding agent", available: true },
  ],
};

export const DEFAULTS = { framework: "express", integration: "sdk", core: "workers", bucket: "r2", model: "off", agent: "generic" };

const find = (key, value) => OPTIONS[key].find((o) => o.value === value) ?? OPTIONS[key].find((o) => o.value === DEFAULTS[key]);

const AGENT_INTRO = {
  claude: "You are Claude Code, working in the repository of my web app.",
  cursor: "You are the Cursor agent, working in the repository of my web app.",
  codex: "You are Codex, working in the repository of my web app.",
  generic: "You are an AI coding agent working in the repository of my web app.",
};

const BUCKET_STEP = {
  r2: [
    "Create a private R2 bucket for BotRampart in my Cloudflare account, for example `acme-botrampart`.",
    "Create an R2 API token scoped to that bucket only, with object read and write. It becomes the secret `lake_writer`.",
    "Set `BR_LAKE_URL` to `s3://<bucket>/br/v1/`.",
  ],
  s3: [
    "Create a private S3 bucket for BotRampart in my AWS account, with public access blocked, for example `acme-botrampart`.",
    "Create a credential that can only read and write objects under `br/v1/` in that bucket. It becomes the secret `lake_writer`.",
    "Set `BR_LAKE_URL` to `s3://<bucket>/br/v1/`.",
  ],
  minio: [
    "Create a private bucket for BotRampart on my MinIO server, for example `acme-botrampart`.",
    "Create a MinIO access key with a policy limited to that bucket. It becomes the secret `lake_writer`.",
    "Set `BR_LAKE_URL` to `s3://<bucket>/br/v1/` and point Core at my MinIO endpoint.",
  ],
  gcs: [
    "Create a private Cloud Storage bucket for BotRampart in my Google Cloud project, for example `acme-botrampart`.",
    "Core writes through the S3 API only, so use Cloud Storage's S3-compatible (XML API) endpoint with an HMAC key for a service account that can only write that bucket. The HMAC key becomes the secret `lake_writer`.",
    "Set `BR_LAKE_URL` to `s3://<bucket>/br/v1/`.",
  ],
  azure: [
    "Create a private Blob Storage container for BotRampart in my Azure storage account, for example `acme-botrampart`.",
    "Core writes through the S3 API only. Ask me which S3-compatible endpoint I use in front of Azure Blob before you go on; do not pick or deploy one yourself. Its credential, limited to that container, becomes the secret `lake_writer`.",
    "Set `BR_LAKE_URL` to `s3://<container>/br/v1/`.",
  ],
};

const CORE_STEP = {
  workers: [
    "Core runs on Cloudflare Workers in my own Cloudflare account (the Workers Paid plan). Its configuration is a Wrangler configuration with D1 for configuration, KV as a read cache, SQLite-backed Durable Objects (one shard per site), R2, Queues and a Cron Trigger.",
    "Write that Wrangler configuration for me to review. Set `BR_LAKE_URL` and `BR_DECISION_PROVIDER` as variables; put `br_keys`, `lake_writer` and any model key in Wrangler secrets, never in the configuration file.",
  ],
  docker: [
    "Core runs as one container on a Linux host I control, listening on port 8787. Recommended: 256 MB of memory. It keeps state in SQLite (or Postgres) and an SQLite file (or Valkey); no other database server.",
    "Write a compose file for me to review that passes `BR_LAKE_URL` and `BR_DECISION_PROVIDER` as environment variables and mounts `br_keys` and `lake_writer` as secrets (for example under `/run/secrets/`), never as plain environment values.",
  ],
  kubernetes: [
    "Core runs as the same single container on my Kubernetes cluster, from plain manifests: a Deployment and a Service on port 8787. Recommended: 256 MB of memory.",
    "Write those manifests for me to review. Pass `BR_LAKE_URL` and `BR_DECISION_PROVIDER` as environment variables and mount `br_keys` and `lake_writer` from a Kubernetes Secret.",
  ],
};

const MODEL_STEP = {
  off: ["Set `BR_DECISION_PROVIDER=off`. The five-minute decision loop stays off; everything else works."],
  gemini: [
    "Set `BR_DECISION_PROVIDER=gemini` (Gemini Decision 1). Core needs my Gemini API key: ask me to put it in Core's secret store myself. Never ask me to paste it into this chat, and never write it to a file.",
    "The decision model runs in shadow mode only: its answers are logged and act on nothing. Do not write any rule that enforces on `ai.*` fields.",
  ],
  local: [
    "Set `BR_DECISION_PROVIDER` to my self-hosted model, so nothing leaves my network. Ask me for its endpoint; check " + SITE + "/docs/configuration/#core for the value's format, and if it is not documented there, stop and ask me.",
    "The decision model runs in shadow mode only: its answers are logged and act on nothing. Do not write any rule that enforces on `ai.*` fields.",
  ],
};

const MOUNT = {
  express: "Mount the backend SDK at the root of the Express app, ahead of every route, so every route gets a path class by default.",
  fastify: "Mount the backend SDK at the root of the Fastify app, before any route is registered, so every route gets a path class by default.",
  next: "Mount the backend SDK in front of every route the Next.js app serves, pages and API routes alike, so every route gets a path class by default.",
};
const TEMPLATE = {
  express: "the HTML layout or template every page uses",
  fastify: "the HTML layout or template every page uses",
  next: "the root layout",
};

// Builds the prompt for a choice of { framework, integration, core, bucket, model, agent }.
export function buildPrompt(choice = {}) {
  const c = { ...DEFAULTS, ...choice };
  const fw = find("framework", c.framework);
  const integ = find("integration", c.integration);
  const core = find("core", c.core);
  const bucket = find("bucket", c.bucket);
  const model = find("model", c.model);
  const agent = find("agent", c.agent);
  const L = [];
  const p = (...lines) => L.push(...lines);
  const list = (items) => items.forEach((i) => L.push(`- ${i}`));

  p("# Install BotRampart in observe mode", "");
  p(`${AGENT_INTRO[agent.value]} Set up BotRampart in observe mode: it decides and logs every request and blocks nothing. Work one step at a time, show me each change before you make it, ask before you create or change anything in a cloud account, and stop wherever this prompt says STOP.`, "");

  p("## What BotRampart is", "");
  list([
    "Open-source, self-hosted bot defense. It runs in my app and my own cloud accounts; no vendor proxy sits in the request path and no traffic goes to a BotRampart server.",
    "The backend SDK runs in front of my handlers. It sets one first-party session cookie, `__br_s` (HttpOnly, signed with my site keys), serves its browser script and challenge routes under `/_br` on my own origin, charges each request to the session's budget, and answers with a challenge (403) or a throttle (429), marked `BR-Challenge: v1`, when the budget runs out. It sets `BR-Sid` and `BR-Decision` on every response.",
    "Core is one small service the SDK syncs with every 5 to 10 seconds: challenges, policy, counters. It writes the decision log to my own bucket (the lake).",
    `Reference: the docs at ${SITE}/docs/ and the HTTP contract at ${SITE}/spec/openapi.yaml. Use only the routes, headers, settings and secret names defined there. Do not invent API names, options or package names.`,
  ]);
  p("");

  p("## My choices", "");
  list([
    `App framework: ${fw.label}${fw.available ? "" : " (no BotRampart SDK yet)"}`,
    `Integration: ${integ.label}${integ.available ? "" : " (coming next, not in today's release)"}`,
    `Core runs on: ${core.label}`,
    `Bucket for the decision log: ${bucket.label}`,
    `Decision model: ${model.label}`,
  ]);
  p("");

  p("## Before you start", "");
  list([
    "BotRampart's packages (the Node backend SDK and Core) are not published to npm or to a container registry yet. When a step needs them, STOP and tell me: \"BotRampart's packages are not published yet, so I stopped here.\" Never guess a package name, image or install command, never copy BotRampart's code in from elsewhere, and never write your own stand-in for the SDK or Core.",
    "Secrets go in my secret store, by name. Never print a secret, never commit one, never ask me to paste one into this chat.",
  ]);
  const blockers = [];
  if (!fw.available) blockers.push(`There is no BotRampart SDK for ${fw.label} yet: the backend SDK is Node only (Express, Fastify, Next.js). Do not port it and do not implement the protocol yourself. STOP after step 2 and tell me so.`);
  if (!integ.available) blockers.push(`The ${integ.short} integration is coming next and is not in today's release. Do not build one. ${fw.available ? `Use the Node backend SDK inside my ${fw.label} app instead in step 4, and tell me you did.` : "STOP after step 2 and tell me so."}`);
  if (c.core === "workers" && c.bucket !== "r2") blockers.push(`On Cloudflare Workers, Core writes its lake to R2. I chose ${bucket.label}: confirm with me which one to use before step 1.`);
  if (blockers.length) { p("", "Coming next, not in today's release, for my choices:", ""); list(blockers); }
  p("");

  p("## Step 1. Provision the bucket", "");
  list(BUCKET_STEP[bucket.value]);
  p("");

  p("## Step 2. Prepare Core's configuration", "");
  list([
    ...CORE_STEP[core.value],
    "Create the secret `br_keys`: the site keys, HMAC keys that sign session tokens and proof-of-work puzzles. Generate them with a cryptographically secure random generator, locally, and store them only in my secret store. The backend SDK reads the same keys through its `secretsFile` setting.",
    "`lake_writer` is the bucket credential from step 1.",
    ...MODEL_STEP[model.value],
  ]);
  p("");

  p("## Step 3. Get the packages", "");
  list([
    "Check the docs at " + SITE + "/docs/getting-started/ for a published package or image. Today there is none: STOP here and tell me that BotRampart's packages are not published yet, with a summary of what you prepared in steps 1 and 2.",
    "Continue with step 4 only when I tell you the packages are available, and install exactly what the docs name.",
  ]);
  p("");

  p("## Step 4. Wire it in, in observe mode", "");
  if (fw.available) {
    list([
      MOUNT[fw.value],
      "Settings: `site` (my site ID), `secretsFile` (the path where `br_keys` is mounted, for example `/run/secrets/br_keys`), `core` (Core's URL), `mode: \"observe\"`. Leave `store` at `\"memory\"` and `onCoreDown` at `\"static\"` unless I say otherwise. See " + SITE + "/docs/configuration/#backend.",
      `Add the browser script to ${TEMPLATE[fw.value]}: \`<script src="/_br/sdk.js" data-site="<site ID>" async></script>\`. It is served from my own origin by the backend SDK.`,
      "If my edge (nginx, a CDN, a load balancer) writes access logs, log `BR-Sid` and `BR-Decision` there and strip both before the response leaves. Never log the `__br_s` cookie.",
      "Do not change `mode` to `\"enforce\"`.",
    ]);
  } else {
    list(["Skip: there is no SDK for my framework yet (see Before you start)."]);
  }
  p("");

  p("## Step 5. Verify", "");
  list([
    "Request `/_br/sdk.js` on my app: it answers 200 with JavaScript.",
    "Request any page and read the response headers at the app, before my edge strips them: `BR-Sid` and `BR-Decision` are present. In observe mode nothing is refused.",
    "Open a page in a browser, then open `/_br/status` in the same tab: it returns JSON with `tier` 0 on a first visit and `tier` 1 a moment later, once the proof-of-work has run.",
    "Within the hour, decision log objects appear under `BR_LAKE_URL`.",
    "Take one decision reference from the log (it looks like `BR-7F3K2Q`) and look it up with getDecision: `GET <core>/v1/decisions/<ref>` with `Authorization: Bearer $BR_CONSOLE_TOKEN` (a viewer-role console token from my secret store; do not print it). It returns the rule, policy version, cost and credits behind that decision.",
  ]);
  p("");

  p("## Step 6. Stop before enforce", "");
  list([
    "Do not switch to enforce mode and do not publish a policy. Enforcing is my decision, after I have watched the decision log and replayed a policy with simulatePolicy (`POST <core>/v1/policy/simulate`).",
    "Report: what you changed and where, which secrets I still need to set (by name), the `BR-Decision` values you saw, and anything you stopped at.",
  ]);
  return L.join("\n");
}

// ---------- Page wiring (browser only) ----------
if (typeof document !== "undefined") {
  const form = document.querySelector("[data-ai-form]");
  const outEl = document.querySelector("[data-ai-prompt]");
  const copyBtn = document.querySelector("[data-ai-copy]");
  const status = document.querySelector("[data-ai-status]");
  const summary = document.querySelector("[data-ai-summary]");
  if (form && outEl) {
    const choice = () => Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, form.elements[k]?.value || DEFAULTS[k]]));
    const render = () => {
      const c = choice();
      outEl.textContent = buildPrompt(c);
      if (summary) {
        const off = ["framework", "integration"].map((k) => find(k, c[k])).filter((o) => !o.available).map((o) => o.short ?? o.label);
        summary.textContent = off.length
          ? `${off.join(" and ")}: coming next. The prompt says so and tells your agent where to stop.`
          : "Every choice is available. The prompt stops where BotRampart's packages are needed, because they are not published yet.";
      }
      if (status) status.textContent = "";
    };
    form.addEventListener("change", render);
    form.addEventListener("submit", (e) => e.preventDefault());
    render();

    if (copyBtn) {
      copyBtn.hidden = false;
      copyBtn.addEventListener("click", async () => {
        const text = outEl.textContent;
        let ok = false;
        try { await navigator.clipboard.writeText(text); ok = true; } catch {
          // Fallback: select the prompt so the reader can copy it with the keyboard.
          const range = document.createRange();
          range.selectNodeContents(outEl);
          const sel = getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
        if (status) status.textContent = ok ? "Prompt copied to the clipboard." : "Copy was blocked. The prompt is selected: press Ctrl+C or Command+C.";
        copyBtn.classList.toggle("is-done", ok);
        setTimeout(() => copyBtn.classList.remove("is-done"), 2000);
      });
    }
  }
}

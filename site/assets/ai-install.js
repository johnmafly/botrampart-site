// Express: install with one AI prompt. Builds a prompt for an AI coding agent from the stack picked
// on /express/ and in the home page's Express section: framework, where the app runs, the CDN or
// edge in front of it, the cloud that hosts Core and the decision log, and how to provision it.
// Client-side only: no network requests, no cookies, no storage. Each page carries the default
// prompt in its HTML (readable without JavaScript, written by the build from buildPrompt());
// this module regenerates it on every change. buildPrompt() is pure and exported.

const SITE = "https://botrampart.agenthatch.ai";

export const OPTIONS = {
  framework: [
    { value: "express", label: "Express", lang: "Node.js", sdk: "the Node backend SDK", mount: "Mount the backend SDK at the root of the Express app, ahead of every route, so every route gets a path class by default.", layout: "the HTML layout or template every page uses" },
    { value: "fastify", label: "Fastify", lang: "Node.js", sdk: "the Node backend SDK", mount: "Register the backend SDK as the first Fastify plugin, before any route, so every route gets a path class by default.", layout: "the HTML layout or template every page uses" },
    { value: "next", label: "Next.js", lang: "Node.js", sdk: "the Node backend SDK", mount: "Put the backend SDK in front of every route the Next.js app serves, pages and API routes alike, so every route gets a path class by default.", layout: "the root layout" },
    { value: "django", label: "Django", lang: "Python", sdk: "the Python backend SDK", mount: "Add the BotRampart middleware at the top of Django's MIDDLEWARE list, so it runs before every view.", layout: "the base template every page extends" },
    { value: "fastapi", label: "FastAPI", lang: "Python", sdk: "the Python backend SDK", mount: "Add the BotRampart ASGI middleware to the FastAPI app before any router is included.", layout: "the base template every HTML page uses" },
    { value: "rails", label: "Rails", lang: "Ruby", sdk: "the Ruby backend SDK", mount: "Insert the BotRampart Rack middleware at the top of the Rails middleware stack.", layout: "app/views/layouts/application.html.erb" },
    { value: "laravel", label: "Laravel", lang: "PHP", sdk: "the PHP backend SDK", mount: "Register the BotRampart middleware globally, first in the HTTP kernel's middleware list.", layout: "the main Blade layout" },
    { value: "spring", label: "Spring Boot", lang: "Java", sdk: "the Java backend SDK", mount: "Register the BotRampart servlet filter with the highest precedence, so it runs before every controller.", layout: "the shared page template (Thymeleaf or your view layer)" },
    { value: "go", label: "Go", lang: "Go", sdk: "the Go backend SDK", mount: "Wrap the root http.Handler with the BotRampart middleware, so every route passes through it.", layout: "the base HTML template" },
  ],
  runtime: [
    { value: "container", label: "Containers or VMs", where: "my containers or virtual machines" },
    { value: "kubernetes", label: "Kubernetes", where: "my Kubernetes cluster" },
    { value: "vercel", label: "Vercel", where: "Vercel" },
    { value: "lambda", label: "AWS Lambda", where: "AWS Lambda" },
    { value: "cloudrun", label: "Google Cloud Run", where: "Google Cloud Run" },
  ],
  edge: [
    { value: "none", label: "No CDN", short: "none" },
    { value: "cloudflare", label: "Cloudflare", short: "Cloudflare", adapter: "the BotRampart Cloudflare Worker, deployed in my own Cloudflare account on the routes in front of my origin" },
    { value: "cloudfront", label: "Amazon CloudFront", short: "CloudFront", adapter: "the BotRampart Lambda@Edge function, attached to my CloudFront distribution's viewer-request and viewer-response events" },
    { value: "nginx", label: "nginx or ingress-nginx", short: "nginx", adapter: "the BotRampart nginx module, loaded in my nginx (or ingress-nginx) in front of the app" },
  ],
  infra: [
    { value: "cloudflare", label: "Cloudflare", core: "Cloudflare Workers", bucket: "R2" },
    { value: "aws", label: "AWS", core: "ECS on Fargate", bucket: "S3" },
    { value: "gcp", label: "Google Cloud", core: "Cloud Run", bucket: "Cloud Storage" },
    { value: "azure", label: "Azure", core: "Azure Container Apps", bucket: "Blob Storage" },
    { value: "k8s", label: "My Kubernetes", core: "a Deployment on my cluster", bucket: "MinIO" },
  ],
  iac: [
    { value: "terraform", label: "Terraform" },
    { value: "pulumi", label: "Pulumi" },
    { value: "cli", label: "Cloud CLI" },
  ],
  model: [
    { value: "off", label: "Off" },
    { value: "gemini", label: "Gemini Decision 1" },
    { value: "local", label: "A self-hosted model" },
  ],
  agent: [
    { value: "claude", label: "Claude Code" },
    { value: "cursor", label: "Cursor" },
    { value: "codex", label: "Codex" },
    { value: "generic", label: "Any coding agent" },
  ],
};

export const DEFAULTS = { framework: "express", runtime: "container", edge: "cloudflare", infra: "cloudflare", iac: "terraform", model: "off", agent: "generic" };

const find = (key, value) => OPTIONS[key].find((o) => o.value === value) ?? OPTIONS[key].find((o) => o.value === DEFAULTS[key]);

const AGENT_INTRO = {
  claude: "You are Claude Code, working in the repository of my web app.",
  cursor: "You are the Cursor agent, working in the repository of my web app.",
  codex: "You are Codex, working in the repository of my web app.",
  generic: "You are an AI coding agent working in the repository of my web app.",
};

// Provisioning: the bucket, its scoped credential and Core, per cloud.
const INFRA = {
  cloudflare: {
    bucket: [
      "A private R2 bucket for the decision log, for example `acme-botrampart`.",
      "An R2 API token scoped to that bucket only, with object read and write. It becomes the secret `lake_writer`.",
    ],
    core: [
      "Core on Cloudflare Workers in my own account (Workers Paid plan): a Worker with D1 for configuration, KV as a read cache, SQLite-backed Durable Objects (one shard per site), the R2 bucket, a Queue and a Cron Trigger.",
      "`BR_LAKE_URL` and `BR_DECISION_PROVIDER` as Worker variables; `br_keys`, `lake_writer` and any model key as Worker secrets, never in the configuration file.",
    ],
  },
  aws: {
    bucket: [
      "A private S3 bucket for the decision log with public access blocked, for example `acme-botrampart`.",
      "An IAM role for Core that can only read and write objects under `br/v1/` in that bucket. Its credential is `lake_writer`.",
    ],
    core: [
      "Core as one container on ECS with Fargate, 0.25 vCPU and 512 MB, behind an internal load balancer on port 8787, reachable only from my app's network.",
      "`BR_LAKE_URL` and `BR_DECISION_PROVIDER` as environment variables; `br_keys` and any model key in AWS Secrets Manager, injected as secrets, never as plain values.",
    ],
  },
  gcp: {
    bucket: [
      "A private Cloud Storage bucket for the decision log with uniform access, for example `acme-botrampart`.",
      "A service account for Core that can only write that bucket, with an HMAC key for Cloud Storage's S3-compatible endpoint. The HMAC key becomes the secret `lake_writer`.",
    ],
    core: [
      "Core as one Cloud Run service on port 8787, minimum one instance, ingress limited to internal traffic and my app.",
      "`BR_LAKE_URL` and `BR_DECISION_PROVIDER` as environment variables; `br_keys`, `lake_writer` and any model key in Secret Manager, mounted as secrets.",
    ],
  },
  azure: {
    bucket: [
      "A private Blob Storage container for the decision log, for example `acme-botrampart`, in a storage account with public access off.",
      "Core writes through the S3 API: use the S3-compatible endpoint BotRampart's integrations guide names for Azure Blob, with a credential limited to that container. It becomes the secret `lake_writer`.",
    ],
    core: [
      "Core as one Azure Container App on port 8787 with internal ingress, reachable only from my app's environment.",
      "`BR_LAKE_URL` and `BR_DECISION_PROVIDER` as environment variables; `br_keys`, `lake_writer` and any model key in Key Vault, referenced as secrets.",
    ],
  },
  k8s: {
    bucket: [
      "A private bucket on my MinIO (or any S3-compatible store the cluster already uses), for example `acme-botrampart`.",
      "An access key with a policy limited to that bucket. It becomes the secret `lake_writer`.",
    ],
    core: [
      "Core on my cluster from plain manifests: a Deployment with one replica (256 MB of memory) and a ClusterIP Service on port 8787.",
      "`BR_LAKE_URL` and `BR_DECISION_PROVIDER` as environment variables; `br_keys`, `lake_writer` and any model key from a Kubernetes Secret.",
    ],
  },
};

const IAC = {
  terraform: "Write it as Terraform in an `infra/botrampart/` folder: one module, variables for names and regions, outputs for Core's URL and the bucket. Run `terraform plan` and show me the plan; apply only after I say yes.",
  pulumi: "Write it as a Pulumi program in an `infra/botrampart/` folder, in the language my repository already uses, with config for names and regions and outputs for Core's URL and the bucket. Run `pulumi preview` and show me the result; run `pulumi up` only after I say yes.",
  cli: "Write it as one reviewed shell script, `infra/botrampart.sh`, using my cloud's own CLI, idempotent and with every name at the top. Show me the script; run it only after I say yes.",
};

const RUNTIME_NOTE = {
  container: "The app runs in my containers or VMs: Core's URL goes in the app's environment, and `br_keys` is mounted as a file the SDK reads through `secretsFile`.",
  kubernetes: "The app runs on my Kubernetes cluster: mount `br_keys` from a Secret as a file the SDK reads through `secretsFile`, and give the app Core's in-cluster URL.",
  vercel: "The app runs on Vercel: set `store` to a shared Redis or Valkey so budgets hold across instances, put `br_keys` in Vercel's encrypted environment variables, and give the app Core's URL.",
  lambda: "The app runs on AWS Lambda: set `store` to a shared Redis or Valkey (ElastiCache) so budgets hold across invocations, load `br_keys` from Secrets Manager at cold start, and give the function Core's URL.",
  cloudrun: "The app runs on Google Cloud Run: set `store` to a shared Redis or Valkey (Memorystore) so budgets hold across instances, mount `br_keys` from Secret Manager as a file, and give the service Core's URL.",
};

const MODEL_STEP = {
  off: ["Set `BR_DECISION_PROVIDER=off`. The five-minute decision loop stays off; everything else works, and I can turn it on later."],
  gemini: [
    "Set `BR_DECISION_PROVIDER=gemini` (Gemini Decision 1). Core needs my Gemini API key: ask me to put it in Core's secret store myself. Never ask me to paste it into this chat, and never write it to a file.",
    "Start the model in shadow mode: its answers are logged as `ai.*` fields beside what the rules did. Do not write rules that act on `ai.*` fields; I switch those on after I have read a week of answers.",
  ],
  local: [
    "Set `BR_DECISION_PROVIDER` to my self-hosted model, so nothing leaves my network. Ask me for its endpoint; the value's format is in " + SITE + "/docs/configuration/#core.",
    "Start the model in shadow mode: its answers are logged as `ai.*` fields beside what the rules did. Do not write rules that act on `ai.*` fields; I switch those on after I have read a week of answers.",
  ],
};

// Builds the prompt for a choice of { framework, runtime, edge, infra, iac, model, agent }.
export function buildPrompt(choice = {}) {
  const c = { ...DEFAULTS, ...choice };
  const fw = find("framework", c.framework);
  const rt = find("runtime", c.runtime);
  const edge = find("edge", c.edge);
  const infra = find("infra", c.infra);
  const iac = find("iac", c.iac);
  const model = find("model", c.model);
  const agent = find("agent", c.agent);
  const L = [];
  const p = (...lines) => L.push(...lines);
  const list = (items) => items.forEach((i) => L.push(`- ${i}`));

  p("# Install BotRampart and provision its infrastructure, in observe mode", "");
  p(`${AGENT_INTRO[agent.value]} Install BotRampart and provision what it runs on, in observe mode: it decides and logs every request and blocks nothing. Work one step at a time, show me each change before you make it, ask before you create or change anything in a cloud account, and stop wherever this prompt says STOP.`, "");

  p("## What BotRampart is", "");
  list([
    "Open-source, self-hosted bot defense. It runs in my app and my own cloud accounts; no vendor proxy sits in the request path and no traffic goes to a BotRampart server.",
    "The backend SDK runs in front of my handlers. It sets one first-party session cookie, `__br_s` (HttpOnly, signed with my site keys), serves its browser script and challenge routes under `/_br` on my own origin, charges each request to the session's budget, and answers with a challenge (403) or a throttle (429), marked `BR-Challenge: v1`, when the budget runs out. It sets `BR-Sid` and `BR-Decision` on every response.",
    "Core is one small service the SDK syncs with every 5 to 10 seconds: challenges, policy, counters. It writes the decision log to my own bucket (the lake).",
    `Reference: the docs at ${SITE}/docs/, the Express guide at ${SITE}/docs/express/ and the HTTP contract at ${SITE}/spec/openapi.yaml. Use only the routes, headers, settings, package names and secret names defined there. Do not invent API names, options or package names.`,
  ]);
  p("");

  p("## My stack", "");
  list([
    `App framework: ${fw.label} (${fw.lang}), with ${fw.sdk}`,
    `The app runs on: ${rt.label}`,
    `CDN or edge: ${edge.value === "none" ? "none, the SDK in the app decides" : edge.label}`,
    `Cloud for Core and the decision log: ${infra.label} (Core on ${infra.core}, the log in ${infra.bucket})`,
    `Provision with: ${iac.label}`,
    `Decision model: ${model.label}`,
  ]);
  p("");

  p("## Ground rules", "");
  list([
    "Install packages only by the exact names and versions BotRampart's getting-started guide gives for my framework (" + SITE + "/docs/getting-started/) and pin them. Never guess a package name or image, and never copy BotRampart's code in from elsewhere.",
    "Secrets go in my secret store, by name. Never print a secret, never commit one, never ask me to paste one into this chat.",
    "Create nothing in a cloud account until I have approved the plan in step 2.",
  ]);
  p("");

  p("## Step 1. Generate the site keys", "");
  list([
    "Create the secret `br_keys`: the site keys, HMAC keys that sign session tokens and proof-of-work puzzles. Generate them locally with a cryptographically secure random generator and store them only in my secret store.",
    "The backend SDK reads the same keys through its `secretsFile` setting; Core reads them as a secret.",
  ]);
  p("");

  p(`## Step 2. Provision the infrastructure on ${infra.label}`, "");
  p(IAC[iac.value], "");
  p("It creates:", "");
  list([...INFRA[infra.value].bucket, ...INFRA[infra.value].core]);
  list([
    `Set \`BR_LAKE_URL\` to \`s3://<bucket>/br/v1/\`.`,
    ...MODEL_STEP[model.value],
  ]);
  p("");
  p("STOP after the plan or preview and wait for my approval before anything is created.", "");

  p("## Step 3. Install the SDK in the app", "");
  list([
    `Add ${fw.sdk} for ${fw.label} to the app, with the package name and version the getting-started guide gives for ${fw.lang}.`,
    fw.mount,
    "Settings: `site` (my site ID), `secretsFile` (the path where `br_keys` is mounted, for example `/run/secrets/br_keys`), `core` (Core's URL from step 2), `mode: \"observe\"`. Leave `onCoreDown` at `\"static\"`. See " + SITE + "/docs/configuration/#backend.",
    RUNTIME_NOTE[rt.value],
    `Add the browser script to ${fw.layout}: \`<script src="/_br/sdk.js" data-site="<site ID>" async></script>\`. It is served from my own origin by the backend SDK.`,
    "Do not change `mode` to `\"enforce\"`.",
  ]);
  p("");

  p(`## Step 4. ${edge.value === "none" ? "Access logs" : `Put BotRampart at the edge: ${edge.short}`}`, "");
  if (edge.value === "none") {
    list(["If anything in front of the app writes access logs (a load balancer or a proxy), log `BR-Sid` and `BR-Decision` there and strip both before the response leaves. Never log the `__br_s` cookie."]);
  } else {
    list([
      `Add ${edge.adapter}, in the same ${iac.label === "Cloud CLI" ? "script" : iac.label + " code"} as step 2. It reads the same \`br_keys\` and syncs with the same Core, so a session's budget is shared between the edge and the app.`,
      "Run it in observe mode too. Send its decision log through the log pack to Core's `ingestRollups` (`POST <core>/v1/ingest/rollups`) with the ingest key from my secret store, so traffic the edge answers on its own still reaches the five-minute loop.",
      "Log `BR-Sid` and `BR-Decision` in the edge's access logs and strip both before the response leaves. Never log the `__br_s` cookie.",
    ]);
  }
  p("");

  p("## Step 5. Verify", "");
  list([
    "Request `/_br/sdk.js` on my app: it answers 200 with JavaScript.",
    "Request any page and read the response headers at the app, before anything strips them: `BR-Sid` and `BR-Decision` are present. In observe mode nothing is refused.",
    "Open a page in a browser, then open `/_br/status` in the same tab: it returns JSON with `tier` 0 on a first visit and `tier` 1 a moment later, once the proof-of-work has run.",
    "Within the hour, decision log objects appear under `BR_LAKE_URL`.",
    "Take one decision reference from the log (it looks like `BR-7F3K2Q`) and look it up with getDecision: `GET <core>/v1/decisions/<ref>` with `Authorization: Bearer $BR_CONSOLE_TOKEN` (a viewer-role console token from my secret store; do not print it). It returns the rule, policy version, cost and credits behind that decision.",
  ]);
  p("");

  p("## Step 6. Stop before enforce", "");
  list([
    "Do not switch to enforce mode and do not publish a policy. Enforcing is my decision, after I have watched the decision log and replayed a policy with simulatePolicy (`POST <core>/v1/policy/simulate`).",
    "Report: what you changed and where, what you provisioned and its outputs, which secrets I still need to set (by name), and the `BR-Decision` values you saw.",
  ]);
  return L.join("\n");
}

// ---------- Page wiring (browser only): every [data-ai-form] on the page drives its own prompt ----------
if (typeof document !== "undefined") {
  for (const form of document.querySelectorAll("[data-ai-form]")) {
    const box = form.closest("[data-ai]") ?? document;
    const outEl = box.querySelector("[data-ai-prompt]");
    const copyBtn = box.querySelector("[data-ai-copy]");
    const status = box.querySelector("[data-ai-status]");
    const summary = box.querySelector("[data-ai-summary]");
    if (!outEl) continue;
    const choice = () => Object.fromEntries(Object.keys(DEFAULTS).map((k) => [k, form.elements[k]?.value || DEFAULTS[k]]));
    const render = () => {
      const c = choice();
      outEl.textContent = buildPrompt(c);
      if (summary) {
        const fw = find("framework", c.framework), infra = find("infra", c.infra), edge = find("edge", c.edge), iac = find("iac", c.iac);
        summary.textContent = `${fw.label} on ${find("runtime", c.runtime).label}${edge.value === "none" ? "" : `, behind ${edge.short}`}. Core on ${infra.core}, the log in ${infra.bucket}, provisioned with ${iac.label}.`;
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
        if (status) status.textContent = ok ? "Prompt copied. Paste it into your coding agent." : "Copy was blocked. The prompt is selected: press Ctrl+C or Command+C.";
        copyBtn.classList.toggle("is-done", ok);
        copyBtn.textContent = ok ? "Copied" : "Copy prompt";
        setTimeout(() => { copyBtn.classList.remove("is-done"); copyBtn.textContent = "Copy prompt"; }, 2000);
      });
    }
  }
}

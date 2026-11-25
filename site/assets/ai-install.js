// Autoinstall: one prompt for your coding agent. Builds a prompt for an AI coding agent from the
// stack picked on /autoinstall/ and in the home page's Autoinstall section: framework, where the app
// runs, the CDN or edge in front of it, the cloud that hosts Core and the decision log, and how to
// provision it.
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

// What runs today, word for word as the quickstart publishes it (/docs/getting-started/#try):
// the reference budget engine from the repository, on Node alone. test/try-budget.test.mjs checks
// this copy against the snippet on the built page and runs both.
export const REPO = "https://github.com/johnmafly/botrampart-site";
export const TRY_BUDGET = `import { newSession, charge, pass, dailyCeiling } from "./site/assets/economics.mjs";

const t = Date.now();
const session = newSession(t);                 // tier 0, 30 units
console.log(charge(session, "search", t));     // search needs tier 1
console.log(pass(session, "pow", t));          // proof-of-work grant
console.log(charge(session, "search", t));     // now it pays
console.log(dailyCeiling());                   // most one session spends in a day`;
export const TRY_BUDGET_OUTPUT = `{ action: 'challenge', challenge: 'pow', cost: 5, credits: 30 }
300
{ action: 'allow', cost: 5, credits: 325 }
35363`;

// Builds the prompt for a choice of { framework, runtime, edge, infra, iac, model, agent }.
// It ends at what runs today (audit #3): the agent clones the repository, runs its tests, the
// benchmark and the budget engine, prices the app's routes with that engine, and writes an install
// plan for the chosen stack into the app's repository. It installs no package and creates nothing
// in a cloud account: BotRampart's guide names no package or version to install.
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

  p("# Install BotRampart's reference code and plan it for my app", "");
  p(`${AGENT_INTRO[agent.value]} Run BotRampart's reference code, price my app's routes with it, and write an install plan for my stack. Work one step at a time, show me each change before you make it, and stop where this prompt says STOP.`, "");

  p("## What BotRampart is", "");
  list([
    "Open-source, self-hosted bot defense. It decides on my own server: no vendor proxy sits in the request path and no traffic goes to a BotRampart server.",
    "Every session holds a budget and every path has a price. A session that runs out meets the next challenge tier (proof-of-work, then a human check) or a 429 throttle. The reference implementation of that budget engine is `site/assets/economics.mjs` in " + REPO + ".",
    `Reference: the docs at ${SITE}/docs/, the Autoinstall guide at ${SITE}/docs/autoinstall/ and the HTTP contract at ${SITE}/spec/openapi.yaml.`,
  ]);
  p("");

  p("## My stack", "");
  list([
    `App framework: ${fw.label} (${fw.lang})`,
    `The app runs on: ${rt.label}`,
    `CDN or edge: ${edge.value === "none" ? "none, the app decides" : edge.label}`,
    `Cloud for Core and the decision log: ${infra.label} (Core on ${infra.core}, the log in ${infra.bucket})`,
    `Write the plan as: ${iac.label}`,
    `Decision model: ${model.label}`,
  ]);
  p("");

  p("## Ground rules", "");
  list([
    "Everything below runs from BotRampart's public repository with Node 24 or later. Install nothing from a package registry: the guide names no BotRampart package or version, so never guess one, and never copy BotRampart's code in from anywhere else.",
    "Change nothing in a cloud account and nothing in my app's code. The only files you write in my repository are the two under `botrampart/` named below.",
    "Secrets stay out of this work: none is needed. Never ask me to paste one into this chat.",
  ]);
  p("");

  p("## Step 1. Run the tests and the benchmark", "");
  list([
    `Clone ${REPO} into a folder next to my repository, for example \`../botrampart-site\`, and work there for steps 1 to 3.`,
    "Run `npm test`: it builds the site and runs every test, including the budget engine's. Report how many passed.",
    "Run `npm run bench`: it verifies 300,000 signed session cookies across 10,000 sessions and charges each request. Report `verify_p50_us`, `verify_p99_us` and `forged_cookie_rejected` from the JSON it prints.",
  ]);
  p("");

  p("## Step 2. Drive the budget engine", "");
  p("Save this as `try-budget.mjs` in the clone's root and run `node try-budget.mjs`:", "");
  p("```js", TRY_BUDGET, "```", "");
  p("It prints:", "");
  p("```text", TRY_BUDGET_OUTPUT, "```", "");
  p("If any line differs, stop and show me both.", "");

  p("## Step 3. Price my routes", "");
  list([
    `Read my ${fw.label} app's routes and give each one a path class: \`static\` (0 units), \`general\` (1), \`search\` (5), \`login\` (10) or \`checkout\` (20), the defaults in \`DEFAULT_POLICY\` in \`site/assets/economics.mjs\`. Write the table, route by route, to \`botrampart/path-prices.md\` in my repository.`,
    "In the clone, write `my-ceiling.mjs`: import `DEFAULT_POLICY` and `dailyCeiling` from `./site/assets/economics.mjs`, copy the policy with any price I changed, and print `dailyCeiling(policy)`. Report the ceiling, and how many requests of my most expensive route one session can make in a day.",
  ]);
  p("");

  p("## Step 4. Write the install plan, and change nothing", "");
  p(`Write \`botrampart/INSTALL-PLAN.md\` in my repository: where each part goes on my stack, with the docs page each line comes from. Carry none of it out.`, "");
  list([
    `The backend SDK: ${fw.mount} Name the file and line in my app.`,
    `The browser script: the line \`<script src="/_br/sdk.js" data-site="<site ID>" async></script>\` in ${fw.layout}. Name the file.`,
    RUNTIME_NOTE[rt.value],
    edge.value === "none" ? "No edge adapter: the app decides on its own." : `At the edge: ${edge.adapter}.`,
    `Core and the decision log on ${infra.label}, written with ${iac.label}: ${[...INFRA[infra.value].bucket, ...INFRA[infra.value].core].join(" ")}`,
    MODEL_STEP[model.value][0],
    "Observe mode first: `mode: \"observe\"`, with enforce left to me. See " + SITE + "/docs/choose/#observe.",
  ]);
  p("");

  p("## Step 5. STOP and report", "");
  list([
    "Stop here. Do not install, provision or deploy anything from the plan.",
    "Report: the test count, the three benchmark figures, whether `try-budget.mjs` printed the four lines above, the path-price table, the daily ceiling, and the path of the plan file.",
  ]);
  return L.join("\n");
}

// One line naming the stack a prompt is for, shown above it.
export function summarize(choice = {}) {
  const c = { ...DEFAULTS, ...choice };
  const fw = find("framework", c.framework), infra = find("infra", c.infra), edge = find("edge", c.edge), iac = find("iac", c.iac);
  return `${fw.label} on ${find("runtime", c.runtime).label}${edge.value === "none" ? "" : `, behind ${edge.short}`}. Core on ${infra.core}, the log in ${infra.bucket}, written as ${iac.label}.`;
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
      if (summary) summary.textContent = summarize(c);
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

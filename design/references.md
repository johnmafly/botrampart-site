# BotRampart site redesign: reference study (9 sites)

Captured on 2026-11-18 with Playwright (Chromium) at 1440x900 and 390x844. Each run recorded video, scrolled slowly (300px every 400ms) and hovered nav items, the primary CTA and cards. Screenshots were taken every ~900px at desktop and every ~1600px on mobile. ffmpeg extracted frames at 1 fps (desktop) and 0.5 fps (mobile).
Raw material: `/tmp/br-refs/<site>/` (shot-NN.png, sheet-N.png contact sheets, motion-early.png = first 9 s of video,
mobile-sheet.png, frames/, 1440/*.webm, 390/*.webm). All 9 sites loaded. Attio needed a clean re-capture (a hovered mega-menu stayed open):
see `attio.com/clean-*.png`.

Lens: BotRampart is open-source, self-hosted bot defense with a dark, warm near-black identity. The static site has a strict CSP
(no inline script/style, no external assets) and motion only under `prefers-reduced-motion: no-preference`.
The most relevant references are **e2b** (dark, infra, blueprint bento), **runkiri** (dark, warm accent, measured
benchmarks, honest diagrams), **vite** (dark ruled grid, install UX), **codync** (dark OSS, privacy data-path
diagram) and **rivet/openorange** (self-host messaging, comparison tables).

---

## 1. runkiri.com (Kiri, a container runtime for Mac)

**Layout & grid.** ~1260px container, 2-col hero, then a steady alternation of full-width "story" sections and
3-col card grids. Section padding ~120px. Sticky header with GitHub star count (11k) and a yellow Download button.

**Typography.** Grotesk sans H1 ~44px bold, tight leading; one keyword underlined in accent ("runtime."). H2 ~36px.
Mono uppercase eyebrows preceded by a small accent square ("■ WHILE IT RUNS"), plus a tiny mono serial in the corner
("KIRU 000112 3"), which gives a machined, instrument-panel feel.

**Hero.** Left: H1, a bold claim line ("8x faster than Docker."), then a precise benchmark sentence with the numbers
underlined. Then a filled yellow CTA, a ghost "Watch the race" button and a small platform note. Right: a real app window
(traffic lights, container list with "Live" badges) with an overlapping toast card and mascot, on a soft yellow
radial glow. Background: faint vertical bar/dot texture.

**Motion.** Restrained. The glow drifts and a pixel "race" strip under the hero plays automatically
("ORBSTACK 5 HAND-OFFS / KIRI ONE LIFT"), peeking above the fold so you scroll. The compare section has an interactive
race with "Run again" and a "10x slower / Real time" toggle. Nav hover is a filled pill. No section reveals.

**Product imagery.** Hop diagrams per engine: rows of dot-nodes, timing at the right in accent mono (178 ms vs 22 ms),
and a green "MEASURED" pill. A sample bench chart is labelled "SAMPLE" in a card with a yellow left border. The
architecture diagram uses bordered boxes "MACOS HOST / LINUX VM" with mono labels, yellow primary nodes and a
dotted vsock line annotated "31 us round trip p50". Pixel-art story beats (pile of crates vs stacked containers).

**Social proof.** A "Works with what you already use" strip of compatible tools (not customer logos) and the GitHub star count.

**Pricing.** None. The final CTA card is H2 "Kiri for Mac is out." + terminal "$ docker run --rm hello-world" +
a green version pill "0.2.1 APPLE SILICON MACOS 14+" + 2 buttons.

**Developer UX.** 4-step setup cards, each with a command input box. A terminal card with a real zsh session. Inline `code`
in feature bodies. The footer has SEO "X alternative" link columns.

| Technique | Why it works | When it fits |
|---|---|---|
| "MEASURED" vs "SAMPLE" labels on numbers | Honesty signal; engineers trust labelled data | Any perf/efficacy claim (bot block rates, latency) |
| Annotated architecture boxes with mono labels + latency on the wire | Shows *where* it runs, which is the self-host story | Explaining the reverse-proxy / sidecar placement |
| Accent-square + mono eyebrow + serial number | Cheap, consistent section identity, "instrument" tone | Every section header on a dark technical site |
| Hero product strip peeking above the fold | Pulls the scroll without a "scroll down" arrow | Any long single page |

---

## 2. openbot.run (OpenBot, a desktop agent team app)

**Layout & grid.** Charcoal (#1c1c1c, not pure black). Centered hero, then an uneven 2-col bento, then sticky stacking cards,
FAQ, compare grid, download, CTA. Mega-menu nav.

**Typography.** Huge H1 ~80px "Meet [app-icon tile] OpenBot", with the brand icon set *inside* the headline. Card titles
20px semibold, body 14px muted. The footer opens with a ~28px statement sentence.

**Hero.** Platform pill ("NEW Available on macOS Windows Linux iOS Android"), H1, a sub with inline model logos, and a white pill
"Download for macOS" with a split OS dropdown + ghost "Contact". A large app window sits under the fold line.

**Motion.** Timed choreography: hero still for ~4s, then a magenta light beam drops from the header and spreads
into a glow that lights the top edge of the app window, leading the eye from CTA to product. "For Teams":
coloured cards stack (position: sticky) while a numbered left list moves an active indicator with scroll. The final CTA's
hex-tile mascot field rises from below.

**Product imagery.** Bento cards with UI mock on top and text below. One card per bento row is a solid pastel
(lavender "Stored on your computer" with a file tree) to break the monotony. A workflow diagram card (trigger -> agents ->
approval).

**Social proof.** Light: a compare grid "OpenBot vs X ->" (4-col gradient thumbnails) doubles as SEO.

**Pricing.** A giant "$0" in metallic gradient text, "Free for personal use", a check row, Download + "License for work ->".

**Developer UX.** Minimal (desktop app). Download cards per OS in pastel with large OS glyphs and "AVAILABLE" pills.

| Technique | Why it works | When it fits |
|---|---|---|
| Brand mark inline in H1 | Names and brands in one beat | Short product names; BotRampart shield glyph inline |
| One accent-filled card per bento row | Breaks repetitive card grids, sets a focal point | Bento of 4-6 features; use the warm accent sparingly |
| Sticky stacking cards + scroll-tracked numbered list | Turns a list of 4 into a guided story | "How it works" 3-5 steps; needs care for reduced motion |
| Giant "$0" pricing | OSS price as a headline feature | Free/self-hosted tier presentation |

---

## 3. usemagpie.ai (Magpie, a local model gateway)

**Layout & grid.** Light, white, narrow ~1040px column, very sober. Mono uppercase eyebrow + H2 + paragraph + one
artifact per section. Hairline-bordered 2x3 / 3x2 tables of short definitions (shared cell borders, not separate cards).

**Typography.** H1 ~48px *two-tone*: "Every agent's model." in black + "One place." in gray. Short H2s ending with a
period ("Paste a key. That's the setup."). Mono for eyebrows, version lines and commands.

**Hero.** 2-col. Left: H1, a long precise sentence, concrete mapping chips ("Codex -> DeepSeek V4 Pro"), black "Download for
Mac" + white "Install from terminal", then a tiny version line (Version 0.1.4489 · Stable · Open source · macOS 12+) with
underlined links. Right: a crisp real screenshot of the menu-bar app with only a drop shadow, no device chrome.

**Motion.** Essentially none. Trust comes from restraint and density of real detail.

**Product imagery.** A 3-box flow diagram (agents -> gateway `127.0.0.1:3425` -> providers). A data-viz card "5,812 values
masked" with a thin bar chart and Sankey-like flow lines.

**Social proof.** A centered logo wall as inline icon+text runs under mono micro headings ("EVERY AGENT / EVERY MODEL").

**Pricing.** None (free, OSS). The closing section has a centered logo, "Every agent. Every model.", "Free, open source, native.", a
Latest/Stable segmented toggle and 3 platform cards with architecture variants.

**Developer UX (best in set).** A one-line install box `$ curl -fsSL https://usemagpie.ai/install.sh | sh` + Copy, then a large
**commented command reference** block (comments right-aligned in gray). The cheat-sheet *is* the product demo.

| Technique | Why it works | When it fits |
|---|---|---|
| Two-tone headline (strong + muted continuation) | Hierarchy without a second size; reads as a thought | H1/H2 on any theme; works in near-white + warm gray |
| Commented command cheat-sheet | Developers judge a tool by its CLI/config surface | Showing BotRampart config/CLI (rules, allowlists) |
| Version/stability micro-line under CTA | Signals a real, maintained release | Hero of any OSS release |
| Hairline definition grid | Dense facts with no card noise | "Details"/spec sections |

---

## 4. openorange.dev (OpenOrange, Cloudflare Workers anywhere)

**Layout & grid.** Off-white, black pill CTAs, orange accent. 2-col hero, alternating story sections, a comparison table,
a stepper, a grid of bindings, an FAQ with a sticky left heading.

**Typography.** H1 ~52px tight tracking. Stat row as big number + small muted label inline ("4.8x cheaper compute").
Mono micro labels on table columns.

**Hero.** H1 "Run Cloudflare Workers anywhere." + a provider logo row (AWS, GCloud, Azure, Rivet Cloud, "Your servers") + sub +
muted "Built for serious scale." + 2 CTAs + stat row. Right: **one witty metaphor object**, an orange in a glass box
labelled "In case of emergency / break walled garden" with a hammer.

**Motion.** The hammer swings like a pendulum, a single looping physical micro-animation; everything else is still. A terminal
types `wrangler dev`. The migration stepper auto-advances (5 steps, active bg + progress underline; the right diagram moves
DNS/CNAME objects from Cloudflare to OpenOrange). The header gains a blurred translucent bg on scroll.

**Product imagery.** A receipt illustration (struck-through Cloudflare prices vs "you pay"). A giant struck-through "128 MB" with an
orange strike + "No runtime limits.". A comparison table: LIMIT | CLOUDFLARE (gray mono, struck) | OPENORANGE (orange header,
bold "No cap").

**Social proof.** A video walkthrough card with duration chip; the footer has a "Compare" column + trademark disclaimer.

**Developer UX.** Numbered steps on the left; dark terminal blocks on the right with real output ("Ready in 0.9s"). A "Copy prompt for
your agent" button next to Get started. A 4-col grid of hairline link chips with arrows + an honest "Not built yet:" note.

| Technique | Why it works | When it fits |
|---|---|---|
| Strike-through of the incumbent's limit | Instantly legible "we remove X" | vs Cloudflare Bot Mgmt / reCAPTCHA (pricing, data leaving you) |
| Comparison table with struck competitor column | Scannable, opinionated, fair format | One compare section; keep claims verifiable |
| Single looping hero micro-animation | Memorable without noise | One CSS keyframe on the hero object |
| "Not built yet" honesty note | Builds credibility with engineers | Feature/integration grids |

---

## 5. rivet.dev (Rivet, actors / agent infrastructure)

**Layout & grid.** Light gray (#f4f4f4) with a **visible blueprint grid**: thin vertical rules at the container edges and "+"
crosshair marks where section borders meet. A floating, rounded, blurred inset nav. An announcement bar on top.

**Typography.** H1 ~56px centered. Stats as big numbers with info icons. Small icon + title + 2-line body cards.

**Hero.** Centered: "Run and scale agents.", sub, muted "Open-source and self-hostable.", a stat row (4.99 ms cold starts / 72 KB per
Actor / 10.4x cheaper storage), orange-red "Start Building" + a **mono command chip** `> npx skills add rivet-dev/skills`.
Below: an isometric white 3D server stack (COMPUTE / MEMORY / STORAGE) on a dot-matrix floor.

**Motion.** Orange dots ripple across the dot-matrix floor (packets travelling): continuous, low-contrast, ambient.

**Product imagery.** Isometric density comparison (57,932 Actors x 72.4KB vs 8 Sandboxes x 512MiB). An architecture panel (Actor nodes ->
Control Plane -> storage) with chip tags (Scheduling / Routing / Observability).

**Social proof.** A grayscale logo row, a GitHub star chip (15.8k), ecosystem icon clusters by category, and a customer story in the mega-menu.

**Self-host messaging (relevant).** 2x2 short cards: "One stateless binary / Managed in your VPC / Storage you control / Local
dev matches production". 3 deploy-path cards (Self-host with an `npm install rivetkit` copy field / Cloud / BYOC), each
ending in a button. The final CTA is a dark rounded block on the light page.

| Technique | Why it works | When it fits |
|---|---|---|
| Blueprint grid lines + "+" crosshairs | Engineering credibility, structure visible | Dark variant: 1px warm-gray rules on near-black |
| Command chip as secondary CTA | Lets devs act from the hero | `docker run ...` / install one-liner next to primary CTA |
| 2x2 self-host promise cards | Answers "where does my data live" in 4 lines | BotRampart's core differentiator |
| Deploy-path cards (self-host / managed / BYOC) | Clear choice architecture | Install options: Docker, binary, Helm |

---

## 6. e2b.dev (E2B, sandboxes for agents) — closest tonal match

**Layout & grid.** Pure black, white text, signal red-orange accent. Everything sits on **1px shared-border cells**: no radius,
no shadows, no gradients. ~1280px container. A pinned scroll story, a blueprint bento, a carousel, pricing, a giant marquee.

**Typography.** A condensed uppercase grotesk for headlines ("EVERY AGENT / GETS A MACHINE", ~44px, second line heavier).
Bracketed mono eyebrows "[ THE AGENT CLOUD ]". Mono uppercase sharp-cornered buttons. Huge condensed numerals for
stats/prices. Weight shift inside a headline ("OPEN AT THE **CORE**").

**Hero.** Left: eyebrow, H1, 2-line body, filled red "START BUILDING" + outlined "TALK TO AN ENGINEER" + a tiny "SETUP FOR
AGENTS" link. Right: a **live fleet dashboard** (8 sandbox tiles with status RUNNING / DONE / PROVISIONING, mini code, a sparkline,
footer "BOOTED FROM SNAPSHOT · UPTIME 04:37:19") with tabs (CODING / BACKGROUND / ENTERPRISE / FINANCIAL).

**Motion.** Hero copy fades/slides in; a dithered pixel field dissolves in at the top-right corner; terminal lines type; a blinking red
cursor. **Pinned scroll story**: the headline stays pinned left while an isometric exploded layer stack (your agents / E2B boundary /
cloud) lights the active layer red as the right-column steps scroll by. Full-bleed marquee text. Carousel arrows.

**Product imagery.** Each bento tile is a **mini diagram of a real capability**: PTY prompt with cursor, port mapping
`:3000 -> https://...`, egress allow/deny table, a file tree with "written 2s ago" red dot, a cpu line chart, a secrets-vault request
showing `Authorization: $STRIPE_KEY` masked by the proxy, a lifecycle timeline RUN-PAUSE-RESUME-FORK. No stock art. Dithered
1-bit images for security/OSS.

**Social proof.** A 4x2 white logo grid, the mono line "100K+ TEAMS ON E2B · 94 OF THE FORTUNE 100", case-study carousel cards,
quote cards with "READ THE CASE STUDY", "[ E2B BY THE NUMBERS ]" with huge stats, an OSS point-cloud with repo names + star counts.

**Pricing.** 3 cards (HOBBY / PRO / ENTERPRISE) with tag pills + red dot, huge condensed "FREE / $150 / CUSTOM", hairline feature
rows, outlined CTA, mono footnote "(✓) NO CREDIT CARD REQUIRED".

**Developer UX.** Package rows `npm e2b` / `PyPI e2b` (mono, underlined, arrow); the final CTA ends with a mono
`pip install e2b // npm i e2b`. API names in spec rows (`sandbox.pause()`).

**Mobile.** Full-width stacked buttons, the bento collapses to single-column full-width cells, a 2-col logo grid, a carousel that peeks the
next card.

| Technique | Why it works | When it fits |
|---|---|---|
| Blueprint bento of capability vignettes | Each tile proves a feature with a real-looking artifact | BotRampart: request log, challenge flow, rule editor, rate graph |
| Pinned headline + stepped layer diagram | Explains a layered architecture in one scroll | "Internet -> BotRampart -> your app" request path |
| Bracketed mono eyebrows, sharp mono buttons | Strong technical identity at ~zero cost | Section labels; consider for a distinct brand voice |
| Status-tile dashboard in hero | Shows the product *operating*, not idle | Hero: live-looking "requests/blocked/challenged" panel |
| Mono footnote under pricing | Removes the last objection | "No account required. Runs on your box." |

---

## 7. vite.dev (Vite, build tool)

**Layout & grid.** Near-black #16161a with violet accent. **Full-height ruled grid**: vertical lines divide the page into cells, and every
section is a cell with shared 1px borders. A logo bar of 6 cells, a 2x3 feature cell grid, an ecosystem diagram, stats + masonry
testimonials, sponsors.

**Typography.** Modest H1 ~40px "The Build Tool for the Web" (confidence through restraint), "BY VOID(0)" micro label.

**Hero.** Left: H1, sub, "Get Started" (glowing violet border) + "View on GitHub", **install tabs** npm / Yarn / pnpm / Bun / Deno
(underline marks the active one) over `$ npm create vite@latest`. Right: exploded isometric wireframe plates.

**Motion.** A continuous hero loop: wireframe file-type plates (.vue .json .tsx .scss) draw in as outlines and descend onto a glowing
core plate, and small chips orbit. It tells "files get processed" without words. The rest is static.

**Product imagery.** Each feature cell has the same anatomy: title + 1-2 lines top; a live UI vignette at the bottom (terminal "VITE v7.1.5
ready in 159 ms", code with a highlighted token, build output with green checks) sitting on a subtle violet streak gradient.

**Social proof.** "80k+ GitHub Stars / 80m+ weekly NPM downloads" + "Loved by the community" masonry of tweet-style cards with avatars;
one card has an accent glow.

**Developer UX.** The package-manager tabs + command are the best pattern for "install in one line". The tabs work without JS if built as
radio inputs + CSS `:checked` (CSP-safe).

| Technique | Why it works | When it fits |
|---|---|---|
| Ruled page grid (cells share borders) | Calm order on dark; makes sparse content feel designed | Whole-site structure for BotRampart |
| Cell anatomy: text top, artifact bottom, accent wash | Uniform rhythm; artifacts carry the proof | Feature grid |
| Install tabs (docker / binary / helm) | One-glance install, choice without clutter | Hero or "Get started" |
| Hero loop telling the core transform | Product in a single image | Requests in -> filtered -> clean traffic out |

---

## 8. codync.dev (Codync, run coding agents from your phone)

**Layout & grid.** Pure black monochrome (no accent hue; white is the accent). Dot-matrix halftone fields fade in at the hero sides.
Centered section headers with tiny gray eyebrow labels. A 3-col card row, sticky phone story, bento, privacy diagram, an inverted white OSS panel,
compare.

**Typography.** H1 ~52px "Bring your [rotating word] into [app icon] Codync". A word rotator cycles agent names with a blur-in/out
transition and a sparkle.

**Hero.** Two stacked chips ("New: run your bots on a free cloud computer ->" and "100% free · Private · End-to-end encrypted, no paid tier"),
H1, sub, a white pill "Download for macOS" with split OS dropdown + dark "Star on GitHub ★2.2K", app-store badges, a platform row +
"Apache 2.0 licensed" underlined, a Product Hunt badge. Below: **the real app embedded and interactive** ("running in your
browser... click a bot, open a room").

**Motion.** The word rotator, a sticky-scroll story (left copy swaps "Approve from your phone" -> "Glance without opening the app"
while the right phone mock stays pinned and changes screen), and a translucent blurred header.

**Product imagery.** Approval card UI (Allow once / Always allow / Deny in red) shows the control model. A "Private by design." section: a left
icon list, and on the right a **vertical data-path diagram** (Your phone -> Relay "Forwards ciphertext it can't open" -> your computer) with dotted
connectors.

**Social proof.** GitHub stars in the CTA, Product Hunt badge. The OSS panel is inverted white with a halftone corner and 3x2 facts with "+" bullet
headers + "Read the code on GitHub".

**Pricing.** Folded into the story: the 3rd card of "Your computer, your agents, your plan." is inverted white with a big "$0".

**Developer UX.** Compare = a checkmark pill cloud (feature parity chips) + 5 "vs X" cards with halftone header strips.

| Technique | Why it works | When it fits |
|---|---|---|
| Data-path diagram with "can't read it" annotation | Makes a privacy claim checkable | "Traffic never leaves your server" / no third-party calls |
| Inverted panel for the OSS section | Section break with weight; signals importance | One inversion on a dark page (warm off-white) |
| Trust chips above H1 | Front-loads OSS/free/private before the pitch | "Open source · Self-hosted · No telemetry" |
| Real control UI (allow/deny) | Shows policy, not adjectives | Rule actions: allow / challenge / block |

---

## 9. attio.com (Attio, CRM)

**Layout & grid.** Light with a pale lavender wash behind the hero product. A black announcement bar. A ~1280px hairline-grid
container with light gray cells. A 5x2 logo cell grid (some cells have a hover arrow linking to a story).

**Typography.** H1 ~48px tight "Welcome to agentic revenue.". **Two-tone sentences everywhere** at ~22px ("Your team, amplified." dark +
rest gray). Serif used *only* for the testimonial quote (~30px, centered alone in huge whitespace). Giant ~80px "Universal
Context™" in the dark segment.

**Hero.** Centered small pill, H1, 2-line gray sub, two small buttons. A big app window **auto-cycles views** every few seconds
(home chat -> companies table -> workflow canvas with floating terminal / video-call / run-history windows), overlapping with parallax.

**Motion.** The most elaborate in the set. Product vignettes animate in each cell (typing in inputs "Sh|", chips orbiting a logo, workflow
connectors drawing, kanban cards, chart bars growing). **A sticky left sub-nav** (Build pipeline / Convert leads / Run sales motions / Forecast
/ Retain) with a blue tick that tracks scroll. **A whole-page theme inversion**: the page and header flip light -> dark for
the "Universal Context" segment (a rainbow horizon arc, a wireframe gravity-well mesh, an integrations icon row, "SDK. API. MCP.") and back.
An exponential curve draws across the scale section with a vertical hatched fill.

**Social proof.** Logo grid, single big serif quote, "Trusted by 30,000+ customers", logo tab strip + full-bleed photo + metric
headline "83% faster lead triage." (two-tone).

**Pricing.** A nav link only on the homepage.

**Developer UX.** One dark segment, "SDK. API. MCP. Build anything on Attio." + View docs. Dev is secondary here.

| Technique | Why it works | When it fits |
|---|---|---|
| Sticky sub-nav with scroll-tracked active item | Orients long feature tours | A 4-6 part "What it stops" tour |
| Animated vignettes per cell (typing, drawing lines) | Product feels alive without video | Only a few, CSS-only, reduced-motion gated |
| Theme inversion for a "platform" segment | Big chapter break, memorable | Dark site: one warm-light segment for docs/OSS |
| Lone serif quote in whitespace | Typographic contrast gives the quote weight | One strong user/maintainer quote |
| Big stats with accent left rule | Clean number hierarchy | "requests filtered", "p50 overhead", "image size" |

---

## Cross-site patterns (observed counts)

- **Command/install surface in or near the hero**: 6/9 (runkiri, magpie, rivet, e2b, vite, openorange).
- **Real product UI, not illustration, as the hero visual**: 6/9. The rest use one metaphor object (openorange) or iso infra art (rivet, vite).
- **Hairline shared-border grids instead of floating cards**: 5/9 (e2b, vite, rivet, magpie, attio). On dark sites this is the dominant look.
- **Mono uppercase eyebrows**: 7/9.
- **Two-tone headlines**: magpie, attio, e2b (weight shift), runkiri (accent underline).
- **Motion budget**: the best dark dev sites (e2b, vite, runkiri) animate *one* hero loop plus a few vignettes; static sections otherwise.
- **Honesty markers**: MEASURED/SAMPLE (runkiri), "Not built yet" (openorange), "(✓) no credit card" (e2b), version lines (magpie, runkiri).
- **Compare pages as footer SEO**: runkiri, openbot, openorange, rivet, codync.

---

## What BotRampart takes

1. **Ruled blueprint grid as the page skeleton (vite, e2b, rivet).** Wrap content in a ~1200px container with 1px
   `border-inline` rules in a warm gray at ~10% alpha. Sections are rows of cells with *shared* borders (`gap: 1px` on a
   grid whose background is the rule colour, with cells on `--bg`). Add "+" crosshair marks at row intersections as CSS
   pseudo-elements. No shadows, radius ≤ 4px. This makes a sparse dark page look engineered.

2. **Hero = claim + install + live-looking product panel (e2b, runkiri, magpie).** Left: mono bracket eyebrow
   `[ SELF-HOSTED BOT DEFENSE ]`, a two-tone H1 (warm off-white + muted warm gray continuation), a 2-line sub, a primary accent button +
   an outlined secondary, then a mono version line ("v0.x · AGPL/MIT · Docker · arm64/amd64"). Right: a static HTML/CSS "traffic
   panel" (tiles for ALLOWED / CHALLENGED / BLOCKED with counts, a request log of 6 rows with path, verdict pill, rule id, ms). It is
   built in markup, not an image, so it stays crisp and CSP-safe.

3. **Install tabs without JS (vite, magpie).** Radio inputs + labels + `:checked ~` panels for `docker run` / `docker compose` /
   binary / Helm. Each panel is a `<pre>` with a `$` prompt and a copy button. Copy needs JS, so put it in the external
   site JS file and hide the button with a `.no-js` class fallback, keeping the command selectable (`user-select: all`).

4. **Bento of capability vignettes, not icon cards (e2b, vite).** 6 cells, each with title + 1 line on top and a real artifact
   at the bottom: a rule snippet (YAML/TOML), a challenge page mini-render, a rate-limit sparkline (inline SVG), a header diff
   (`X-Bot-Score: 0.93`), a log tail, and a fingerprint-match table. One cell gets the accent wash (openbot's one-filled-card
   rule) to set the focal point.

5. **Request-path diagram that makes the self-host claim checkable (runkiri, codync, e2b).** Boxes in mono uppercase labels:
   `INTERNET -> BOTRAMPART (your server) -> YOUR APP`, with annotations on the wires ("p50 +0.4 ms", "no third-party calls",
   "decisions logged locally"). Mark numbers **MEASURED** (with method link) or **SAMPLE**. Build it as an inline SVG file
   referenced via `<img>` or as HTML boxes. Optional: a pinned-heading version where the active layer lights up as steps scroll
   (`position: sticky` + an IntersectionObserver in the external JS that toggles a class).

6. **Scroll reveal, one pattern, gated.** Base CSS shows everything (no hidden-by-default content). Inside
   `@media (prefers-reduced-motion: no-preference)`, `.reveal` starts at `opacity:0; translate: 0 16px` and transitions over 500ms
   `cubic-bezier(.2,.7,.2,1)` when the external JS adds `.is-in` via IntersectionObserver (threshold 0.15, unobserve after
   firing). Stagger bento cells with `transition-delay` set via nth-child classes, not inline styles. Where supported, the
   `animation-timeline: view()` CSS-only version is a progressive enhancement.

7. **Exactly one ambient hero loop (openorange, vite, rivet, runkiri).** One CSS keyframe story, for example request dots
   flowing left-to-right through a shield gate, where red dots are diverted and warm dots pass, or log rows appending every 1.2s. A slow
   warm radial glow drift (20-30s) behind the panel. Nothing else loops. All of it lives inside the reduced-motion media query, and
   the static frame must read well on its own.

8. **Type scale and voice.** Sans display for H1 at clamp(2.5rem, 5vw, 4rem), weight 600, tracking -0.02em. H2 at clamp(1.75rem, 3vw, 2.5rem).
   Body at 17-18px / 1.6. A mono (self-hosted font file) for eyebrows, labels, numbers, buttons' secondary text, with 0.08em tracking, uppercase,
   11-12px. Two-tone headings via a `<span class="muted">` continuation. Short H2s ending in a period ("Your traffic. Your
   rules. Your server.").

9. **Section rhythm.** Padding 120px desktop / 72px mobile. Each section: accent square + mono eyebrow, H2, ≤2-line lead,
   then one artifact. Alternate full-width artifacts with 2- and 3-col cell grids. Let the hero's bottom artifact peek ~80px above the fold.
   Insert one **inverted warm-light panel** (codync, attio) for the open-source section ("Read every line. Licence, repo, audit
   notes.") to give the page a chapter break.

10. **Honest comparison table (openorange, codync).** LIMIT | reCAPTCHA / Cloudflare Turnstile / hosted bot mgmt | BOTRAMPART. The
    competitor column is in muted mono, and only verifiable facts (data leaves your infra: yes/no; price; self-host: no/yes; open
    source). Use strike-through only on hard limits. Add a "Not built yet:" line under the feature grid so claims stay credible.

11. **Trust strip and footnotes instead of logos (runkiri, e2b, magpie).** Until there are customer logos, show "Works with" cells
    (nginx, Caddy, Traefik, Kubernetes, Docker, Node/Express), a GitHub star chip, the licence, the latest release + date, and mono footnotes under
    CTAs: "No account. No telemetry. Runs offline."

12. **Mobile.** Stack CTAs full-width, keep the install block directly under the hero copy, collapse the bento to 1 column (cells keep shared
    borders), turn horizontal card rows into `overflow-x: auto; scroll-snap-type: x mandatory` with the next card peeking 15% (e2b),
    and keep a sticky slim header with one accent "Get started" button.

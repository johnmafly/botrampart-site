// Site chrome and honest paths (audit 2026-11-24, PR B): the calls to action lead somewhere real
// (#1), the footer is a standard one with a security contact (#11), every page has link previews and
// icons (#18), and assets are lean and versioned (#20). Browser measurements (header width, tap
// targets, what is visible) are in header-width.test.mjs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { cleanDomain } from "../site/assets/auth.js";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
if (!existsSync(join(dist, "index.html"))) {
  const { execFileSync } = await import("node:child_process");
  execFileSync(process.execPath, [join(root, "scripts", "build.mjs")], { stdio: "inherit" });
}
const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});
const pages = walk(dist).filter((f) => f.endsWith(".html")).map((f) => ({ name: relative(dist, f), html: readFileSync(f, "utf8") }));
const html = (route) => readFileSync(join(dist, route, "index.html"), "utf8");
const src = (p) => readFileSync(join(root, p), "utf8");
const ORIGIN = "https://botrampart.agenthatch.ai";
const routeOf = (name) => name === "index.html" ? "/" : name.endsWith("/index.html") ? `/${name.slice(0, -10)}` : `/${name}`;

test("/access/ is an honest request path: GitHub issues with the questions filled in, no invented contact", () => {
  const page = html("access");
  const issues = [...page.matchAll(/href="(https:\/\/github\.com\/johnmafly\/botrampart-site\/issues\/new\?[^"]+)"/g)].map((m) => new URL(m[1].replace(/&amp;/g, "&")));
  const titles = new Set(issues.map((u) => u.searchParams.get("title")));
  assert.deepEqual([...titles].sort(), ["Access request: <company>", "Cloud waitlist: <company>", "Walkthrough request: <company>"]);
  for (const u of issues) assert.match(u.searchParams.get("body"), /\*\*Company:\*\*[\s\S]*This issue is public/, `${u.searchParams.get("title")}: a filled-in template that says it is public`);
  const first = page.match(/<a class="btn btn-primary" href="([^"]+)">Get a demo on GitHub/);
  assert.ok(first, "the first action asks for a walkthrough");
  assert.match(first[1], /title=Walkthrough%20request/);
  assert.match(page, /it has no sales email or contact form/, "says why requests are issues");
  assert.match(page, /Issues are public/);
  for (const { name, html: h } of pages) assert.doesNotMatch(h.replace(/<!--email_off-->[\s\S]*?<!--\/email_off-->/g, ""), /mailto:|@botrampart\.|@agenthatch\./, `${name}: an invented contact address`);
});

test("sign-up and sign-in end honestly: no account, the console with sample data, the Cloud waitlist", () => {
  const up = html("signup");
  const done = up.match(/<section class="auth-done"[\s\S]*?<\/section>/)[0];
  assert.match(done, /No account was created and nothing you typed was sent or stored/);
  assert.match(done, /<a class="btn btn-primary" href="\/dashboard\/" data-console-link>Open the console<\/a>/);
  assert.match(done, /<a class="btn btn-ghost" href="\/access\/#requests">Join the Cloud waitlist<\/a>/);
  const inn = html("signin").match(/<section class="auth-done"[\s\S]*?<\/section>/)[0];
  assert.match(inn, /Accounts open with BotRampart Cloud/);
  assert.match(inn, /href="\/access\/#requests">Join the Cloud waitlist/);
  const auth = src("site/assets/auth.js");
  assert.match(auth, /link\.href = `\/dashboard\/#site=\$\{encodeURIComponent\(domain\)\}`/, "the console link carries the domain in the #fragment");
  assert.doesNotMatch(auth, /localStorage|sessionStorage|document\.cookie|fetch\(/, "nothing stored or sent");
});

test("the domain entered at sign-up: cleaned to a host name, and the console shows it as sample data", () => {
  assert.equal(cleanDomain("shop.acme.com"), "shop.acme.com");
  assert.equal(cleanDomain(" https://Shop.Acme.com/path?x=1 "), "shop.acme.com");
  assert.equal(cleanDomain("shop.acme.com:8443"), "shop.acme.com");
  for (const bad of ["", "localhost", "<script>", "a..b", "-bad.com", "x".repeat(130) + ".com", "shop acme.com"]) assert.equal(cleanDomain(bad), "", JSON.stringify(bad));
  const dash = src("site/assets/dashboard.js");
  assert.match(dash, /location\.hash\.match\(\/\^#site=/, "reads #site= from the URL");
  assert.match(dash, /cleanDomain\(decodeURIComponent/, "and cleans it");
  assert.match(dash, /Every number here is sample data generated in your browser: none of \$\{custom\}'s traffic reaches this preview/, "the banner says it is sample data");
  assert.match(dash, /history\.replaceState\(null, "", location\.pathname \+ location\.search \+ "#overview"\)/, "the domain leaves the address bar");
});

test("standard footer: name, copyright, GitHub, Security, Request access; no internal notes", () => {
  for (const { name, html: h } of pages) {
    const foot = h.match(/<footer class="foot">[\s\S]*?<\/footer>/)?.[0];
    if (name === "404.html" && !foot) continue;
    assert.ok(foot, `${name}: the footer`);
    assert.match(foot, /© 2026 BotRampart/);
    assert.match(foot, /<a href="https:\/\/github\.com\/johnmafly\/botrampart-site">GitHub<\/a>/);
    assert.match(foot, /<a href="https:\/\/github\.com\/johnmafly\/botrampart-site\/security\/advisories\/new">Security<\/a>/);
    assert.match(foot, /<a href="\/access\/"[^>]*>Request access<\/a>/);
    assert.doesNotMatch(foot, /not indexed|star count|Sample figures|<h2>Research<\/h2>/, `${name}: an internal note in the footer`);
  }
});

test("security.txt (RFC 9116) names the private reporting address and expires within a year; HSTS is sent", () => {
  const txt = readFileSync(join(dist, ".well-known", "security.txt"), "utf8");
  assert.match(txt, /^Contact: https:\/\/github\.com\/johnmafly\/botrampart-site\/security\/advisories\/new$/m);
  const expires = new Date(txt.match(/^Expires: (\S+)$/m)[1]);
  const days = (expires - Date.now()) / 864e5;
  assert.ok(days > 0, "security.txt has expired: set a new Expires date");
  assert.ok(days <= 366, `Expires is ${Math.round(days)} days out (at most a year)`);
  assert.match(txt, /^Canonical: https:\/\/botrampart\.agenthatch\.ai\/\.well-known\/security\.txt$/m);
  const headers = readFileSync(join(dist, "_headers"), "utf8");
  assert.match(headers, /^\/\*\n(?: {2}\S.*\n)*? {2}Strict-Transport-Security: max-age=31536000; includeSubDomains$/m, "HSTS on every response");
});

test("link previews: canonical URL, Open Graph and Twitter tags, icons, and descriptions of at most 160 characters", () => {
  for (const name of ["og.png", "favicon.ico", "apple-touch-icon.png"]) assert.ok(existsSync(join(dist, name)), `/${name}`);
  const png = readFileSync(join(dist, "og.png"));
  assert.deepEqual([png.readUInt32BE(16), png.readUInt32BE(20)], [1200, 630], "the share image is 1200 x 630");
  for (const { name, html: h } of pages) {
    const route = routeOf(name);
    const meta = (attr, key) => h.match(new RegExp(`<meta ${attr}="${key}" content="([^"]*)">`))?.[1];
    const title = h.match(/<title>([^<]*)<\/title>/)[1];
    const desc = meta("name", "description");
    assert.ok(desc, `${name}: a description`);
    if (!route.startsWith("/docs/")) assert.ok(desc.replace(/&amp;/g, "&").replace(/&quot;/g, '"').length <= 160, `${name}: description is ${desc.length} characters`);
    assert.equal(meta("property", "og:title"), title, `${name}: og:title`);
    assert.equal(meta("property", "og:description"), desc, `${name}: og:description`);
    assert.equal(meta("name", "twitter:card"), "summary_large_image", `${name}: twitter:card`);
    assert.equal(meta("property", "og:image"), `${ORIGIN}/og.png`, `${name}: og:image`);
    assert.equal(meta("name", "twitter:image"), `${ORIGIN}/og.png`, `${name}: twitter:image`);
    assert.match(h, /<link rel="icon" href="\/favicon\.ico" sizes="32x32">/, `${name}: favicon.ico`);
    assert.match(h, /<link rel="apple-touch-icon" href="\/apple-touch-icon\.png">/, `${name}: apple-touch icon`);
    if (name === "404.html") {
      assert.doesNotMatch(h, /rel="canonical"|og:url/, "the 404 page names no canonical URL");
      continue;
    }
    assert.match(h, new RegExp(`<link rel="canonical" href="${ORIGIN}${route}">`), `${name}: canonical`);
    assert.equal(meta("property", "og:url"), ORIGIN + route, `${name}: og:url`);
  }
});

test("assets: CSS is minified, the home page loads no build.css, and the console screenshot has a hashed name", () => {
  const css = walk(join(dist, "assets")).filter((f) => f.endsWith(".css"));
  assert.ok(css.length >= 5);
  for (const f of css) {
    const text = readFileSync(f, "utf8");
    assert.doesNotMatch(text, /\/\*/, `${relative(dist, f)}: comments left`);
    assert.ok(text.split("\n").length <= 2, `${relative(dist, f)}: not minified`);
  }
  const site = css.find((f) => /site\.[0-9a-f]{10}\.css$/.test(f));
  assert.ok(statSync(site).size < src("site/assets/site.css").length * 0.9, "site.css is at least 10% smaller published");
  const home = html("");
  assert.doesNotMatch(home, /\/assets\/build\.[0-9a-f]{10}\.css/, "home does not load build.css");
  assert.match(home, /<img src="\/assets\/home\/dashboard\.[0-9a-f]{10}\.webp"/, "dashboard.webp is fingerprinted");
  assert.ok(!existsSync(join(dist, "assets", "home", "dashboard.webp")), "and not published under its old name");
});

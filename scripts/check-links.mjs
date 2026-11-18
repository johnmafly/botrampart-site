// Checks that every source_url in claims.yaml resolves. Network-dependent, so it is not part of
// `npm test`; run it with `npm run check-links` before a round. Some vendor sites answer automated
// requests with 403 or 429 (bot defense, fittingly); those are reported, not hidden.
import { readClaims } from "./claims.mjs";

const claims = readClaims(new URL("../claims.yaml", import.meta.url).pathname);
const urls = [...new Set(claims.map((c) => c.source_url))];
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

async function check(url) {
  for (const method of ["HEAD", "GET"]) {
    try {
      const r = await fetch(url, { method, redirect: "follow", headers: { "user-agent": UA, accept: "text/html,application/pdf,*/*" }, signal: AbortSignal.timeout(20000) });
      if (r.ok || method === "GET") return r.status;
    } catch (e) {
      if (method === "GET") return `error: ${e.cause?.code || e.message}`;
    }
  }
}

const results = [];
for (let i = 0; i < urls.length; i += 8) {
  results.push(...await Promise.all(urls.slice(i, i + 8).map(async (u) => [u, await check(u)])));
}
const bad = results.filter(([, s]) => s !== 200);
for (const [u, s] of results) console.log(`${s}\t${u}`);
console.log(`\n${results.length - bad.length} of ${results.length} source URLs answered 200.`);
if (bad.some(([, s]) => s === 404 || s === 410 || String(s).startsWith("error"))) process.exitCode = 1;

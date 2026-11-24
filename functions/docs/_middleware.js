// Content negotiation for the docs (Cloudflare Pages Function, runs only on /docs/*).
// A client that asks for Markdown at a docs page's own address gets the page's Markdown:
//   curl -H "Accept: text/markdown" https://botrampart.agenthatch.ai/docs/getting-started/
// answers with /docs/getting-started.md, as text/markdown, and names it in Content-Location.
// Every other request passes straight through to the static file, so a browser sees no change;
// HTML answers gain "Vary: Accept" so a cache never serves one form for the other. If anything
// here throws, Pages serves the static file as if this function were not there.
const PAGE = /^\/docs\/(?:([a-z0-9-]+)\/?)?$/;

// q-value a client gives a media type in its Accept header; 0 when it does not list it.
// "*/*" and "text/*" are not counted: a client that only sends those did not ask for Markdown.
export function quality(accept, type) {
  let best = 0;
  for (const part of String(accept || "").split(",")) {
    const [name, ...params] = part.trim().toLowerCase().split(";").map((s) => s.trim());
    if (name !== type) continue;
    const q = params.find((p) => p.startsWith("q="));
    const value = q ? Number(q.slice(2)) : 1;
    if (Number.isFinite(value)) best = Math.max(best, Math.min(1, Math.max(0, value)));
  }
  return best;
}

// Markdown is wanted when the client lists text/markdown and ranks it above text/html.
export const wantsMarkdown = (accept) => quality(accept, "text/markdown") > 0 && quality(accept, "text/markdown") > quality(accept, "text/html");

// The Markdown address of a docs page path, or null when the path is not a docs page.
export function markdownPath(pathname) {
  const m = PAGE.exec(pathname);
  if (!m) return null;
  return m[1] ? `/docs/${m[1]}.md` : "/docs/index.md";
}

export async function onRequest(context) {
  const { request, next, env } = context;
  context.passThroughOnException();
  const url = new URL(request.url);
  const md = request.method === "GET" || request.method === "HEAD" ? markdownPath(url.pathname) : null;
  if (!md) return next();
  if (wantsMarkdown(request.headers.get("Accept"))) {
    const res = await env.ASSETS.fetch(new Request(new URL(md, url), { method: request.method }));
    if (res.ok) {
      const headers = new Headers(res.headers);
      headers.set("Content-Type", "text/markdown; charset=utf-8");
      headers.set("Content-Location", md);
      headers.set("Vary", "Accept");
      return new Response(res.body, { status: 200, headers });
    }
  }
  const page = await next();
  const out = new Response(page.body, page);
  out.headers.append("Vary", "Accept");
  return out;
}

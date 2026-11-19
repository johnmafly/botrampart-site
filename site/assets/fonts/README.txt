BotRampart site fonts. Self-hosted; nothing is loaded from a font service.

br-sans.woff2         Geist (Vercel), variable, instanced at wght 400-700. The one sans for
                      headings and text, used at medium weights (500-520).
br-mono.woff2         CommitMono 400. Every machine-shaped string: IDs, latencies, tab labels,
                      eyebrows, code.
br-mono-medium.woff2  CommitMono 500.
All subset to Basic Latin, Latin-1, general punctuation, arrows, math signs, box-drawing and
block elements.

Sources: the geist npm package 1.9.2 (dist/fonts/geist-sans/Geist-Variable.ttf) and
@fontsource/commit-mono 5.3.0 (latin 400 and 500). Instanced and subset with fontTools
(varLib.instancer, pyftsubset --flavor=woff2), 2026-11-19.
Both are licensed under the SIL Open Font License 1.1: see OFL-Geist.txt and OFL-CommitMono.txt
in this folder. Loaded with font-display: swap and metric-adjusted fallbacks.

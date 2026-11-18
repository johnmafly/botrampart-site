BotRampart site fonts. Self-hosted; nothing is loaded from a font service.

br-display.woff2  Bricolage Grotesque, variable, instanced at opsz 72, wdth 75-100, wght 500-800.
                  Subset to Basic Latin plus the punctuation the headlines use.
br-text.woff2     Bricolage Grotesque, variable, instanced at opsz 14, wdth 100, wght 300-700.
                  Subset to Latin-1, general punctuation, arrows and math signs.
br-mono.woff2     Martian Mono, variable, instanced at wdth 87.5, wght 300-700. Same subset plus
                  box-drawing and block elements.

Sources: github.com/google/fonts ofl/bricolagegrotesque and ofl/martianmono (main, 2026-11-18).
Instanced and subset with fontTools (varLib.instancer, pyftsubset --flavor=woff2).
Both are licensed under the SIL Open Font License 1.1: see OFL-BricolageGrotesque.txt and
OFL-MartianMono.txt in this folder. Loaded with font-display: swap and metric-adjusted fallbacks.

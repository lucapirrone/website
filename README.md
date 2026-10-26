# Luca Pirrone — La città

Sito personale: una città 3D in cui ogni edificio è un progetto, con versione classica e pagine progetto indicizzabili.

- **Contenuti**: `src/content/site.ts` (unica fonte: pagine, SEO e città leggono da qui)
- **Città 3D**: `src/city/engine.js` (Three.js 0.128, isola client)
- **SEO**: `src/lib/seo.ts`, `src/app/{sitemap,robots,manifest}.ts`, immagini OG generate
- **Processo**: [pair](https://github.com/foomakers/pair) — `.pair/adoption/` per PRD, stack e decisioni

```bash
pnpm install
pnpm dev            # http://localhost:3000
pnpm quality-gate   # typecheck, test, lint, format
pnpm build
```

Variabile: `NEXT_PUBLIC_SITE_URL` (origine canonica, default `https://lucapirrone.com`).

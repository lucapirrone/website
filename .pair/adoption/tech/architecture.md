# Architecture

## Purpose

Validated architectural decisions. Rationale: [ADR-2026-10-26-static-site-with-3d-island](adr/ADR-2026-10-26-static-site-with-3d-island.md).

## Decisions

- **Style:** static site, no backend. All routes prerendered at build (SSG).
- **Rendering:** React Server Components for all content; the 3D city is a single client island mounted after hydration via dynamic import.
- **Content:** single typed module `src/content/site.ts` is the only source of truth for person, projects, free lots. UI and 3D engine read it; never duplicate content.
- **Routes:** `/` (city + classic view), `/progetti/[slug]` (one per project, `generateStaticParams`, `dynamicParams = false`).
- **SEO layer:** `src/lib/seo.ts` builds metadata and JSON-LD from content. File conventions: `sitemap.ts`, `robots.ts`, `manifest.ts`, `opengraph-image.tsx`, `icon.tsx`.
- **3D engine:** `src/city/engine.js` (plain JS, Three.js 0.128), exposes `mountCity(root, options)`; owns canvas and overlay behaviour only. Navigation to project pages via callback.
- **Static assets:** logos in `public/logos/`, fonts self-hosted via `next/font`.
- **Boundaries:** no client component imports server-only modules; the engine never fetches content.

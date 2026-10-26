# ADR: Static Next.js site with the 3D city as a client island

## Status

Accepted

## Date

2026-10-26

## Context

- The concept is one HTML file: Three.js r128 engine, content generated in JS, logos in base64 (~520 KB).
- Goal: top SEO (indexable content, per-project pages, structured data) without losing the 3D experience.
- One maintainer, no backend needs.

## Options Considered

### Option 1: Port the engine to React Three Fiber

- **Pros**: idiomatic React, typed.
- **Cons**: full rewrite of ~1,800 lines; r128 APIs differ from current three; high risk of visual regressions.

### Option 2: SSG pages + engine as plain-JS client island

- **Pros**: engine reused almost verbatim; all content server-rendered; 3D loads after first paint.
- **Cons**: engine stays untyped JS; three pinned to 0.128.

### Option 3: Keep single HTML file behind a CDN

- **Pros**: zero work.
- **Cons**: no indexable content, no per-project pages.

## Decision

Option 2. SEO and first paint come from server-rendered HTML; the engine is imported dynamically on the client and mounted on a full-screen canvas. Content lives in one typed module consumed by pages, SEO builders and the engine.

## Consequences

### Benefits

- Every word visible in the 3D view also exists in the HTML.
- Adding a project touches only `src/content/site.ts`.

### Trade-offs and Limitations

- `three` pinned to 0.128.0; upgrading requires migrating `Font`/`TextGeometry`/`sRGBEncoding`.
- Engine is `// @ts-nocheck` JS: covered by smoke checks, not unit tests.

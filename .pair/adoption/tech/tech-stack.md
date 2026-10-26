# 🛠️ Technology Stack

## Purpose

Validated technology choices with versions.

## Runtime & Framework

- Node.js 22 LTS, pnpm 10.28
- Next.js 16.4 (App Router, Turbopack), React 19.3
- TypeScript 5.9 (strict)

## 3D

- three 0.128.0 (pinned: engine uses r128 APIs — `Font`, `TextGeometry`, `sRGBEncoding`)

## Styling

- Plain CSS (`src/app/globals.css`), CSS custom properties as tokens. No CSS framework.
- Fonts: Archivo (variable, wdth 62–125) and IBM Plex Mono via `next/font/google`.

## Quality

- ESLint 9 + `eslint-config-next` 16.4
- Prettier 3
- Vitest 3 (unit: content, SEO builders)
- E2E: none in v1 (build + smoke script)

## Tooling

- `@foomakers/pair-cli` 0.5.2 (KB + skills)

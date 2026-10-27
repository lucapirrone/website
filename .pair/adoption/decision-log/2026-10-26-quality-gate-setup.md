# ADL: Quality gate setup

- **Date:** 2026-10-26
- **Decision:** standard pipeline only — `ts:check`, `test`, `lint`, `format:check`, aggregated by `pnpm quality-gate`; run in GitHub Actions on PRs. Review enforcement `disabled` (single maintainer). No husky hooks in v1.
- **Process profile:** `poc` (no DDD mapping, no strategic planning layer).

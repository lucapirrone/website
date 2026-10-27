# Infrastructure

## Decisions

- **Hosting:** Vercel (static + edge for OG images). Production branch `main`, preview per PR.
- **Domain:** set via `NEXT_PUBLIC_SITE_URL` (default `https://lucapirrone.com` until the real domain is confirmed).
- **CI:** GitHub Actions — `pnpm quality-gate` on every PR.
- **No servers, no database, no secrets** in v1.

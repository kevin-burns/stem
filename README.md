# url-shortener

A modern, secure, single-user URL shortener on Cloudflare Workers (Hono + D1),
with a cross-browser extension (separate project). MIT licensed.

**This repository contains no secrets.** All credentials — including your
short-link hostname — are supplied at deploy time via Wrangler Secrets or the
Cloudflare dashboard.

## Features
- 302 redirects with privacy-friendly click counts (no IPs, no per-visitor logs)
- REST API (`/api/links`) behind Cloudflare Access + a scoped Bearer token
- Link safety: scheme allowlist, normalization, anti-SSRF, self-reference block,
  and a pluggable reputation check (Google Safe Browsing by default)
- Expiring and one-time / N-click links
- Admin dashboard at `/admin`

## Project layout
- `shared/` — framework-free validation (Zod schemas, slug rules, URL safety) reused by the worker and the extension
- `worker/` — the Cloudflare Worker (Hono routes, D1 access, auth, safety pipeline)

## Develop
```bash
npm install
cp worker/.dev.vars.example worker/.dev.vars   # fill in API_TOKEN, SHORT_DOMAIN, etc.
npm --workspace worker run migrate:local
npm --workspace worker run dev
npm test
```

## Deploy
```bash
# 1. Create the D1 database and copy its id into worker/wrangler.toml
npx wrangler d1 create url_shortener

# 2. Apply migrations to the remote database
npm --workspace worker run migrate:remote

# 3. Set secrets (never committed)
npx wrangler secret put API_TOKEN
npx wrangler secret put SHORT_DOMAIN          # your short-link host, e.g. l.example.com
npx wrangler secret put SAFE_BROWSING_API_KEY # optional reputation provider

# 4. Add your short-link domain as a Workers route / custom domain in the
#    Cloudflare dashboard, then deploy
npm run deploy
```

## Protect /admin and /api with Cloudflare Access
In the Cloudflare Zero Trust dashboard, create an Access application covering
`/admin*` and `/api/*` on your domain, restricted to your identity. Then set the
worker secrets `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` so the worker verifies the
Access JWT as defense-in-depth.

## License
MIT — see [LICENSE](./LICENSE).

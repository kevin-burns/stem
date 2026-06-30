# Stem

An edge URL shortener.

A single-user URL shortener that runs on [Cloudflare Workers](https://workers.cloudflare.com/)
([Hono](https://hono.dev/) + [D1](https://developers.cloudflare.com/d1/)), with a
Chrome-compatible browser extension. MIT licensed.

**No secrets live in this repo.** Every credential, including your short-link
hostname, is set at deploy time through [Wrangler Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
or the [Cloudflare dashboard](https://dash.cloudflare.com/).

## What it does

- Redirects with 302, so disabling or expiring a link takes effect right away, and counts clicks without storing IPs or per-visitor logs
- Exposes a REST API at `/api/links`. The worker verifies either a scoped Bearer token or a Cloudflare Access JWT; put Access in front of `/api` and clients (browser dashboard, extension via an Access service token) authenticate through it
- Checks every destination before saving it: scheme allowlist, normalization, private/internal-host (SSRF) blocking, a self-reference block, and a pluggable reputation lookup (Google Safe Browsing by default)
- Supports links that expire on a date or self-destruct after N clicks
- Ships an admin dashboard at `/admin`
- Generates a QR code for any short link — in the dashboard (a `GET /api/links/:slug/qr` SVG endpoint) and in the extension popup (rendered client-side)

## Admin dashboard

The dashboard at `/admin` (behind Cloudflare Access) lists your links and creates new ones:

![The admin dashboard, with numbered callouts](images/admin-dashboard.webp)

1. Paste a destination URL
2. Optional custom slug
3. Shorten it
4. Search by slug or destination
5. Hide inactive links (expired / disabled / used up)
6. Delete all inactive links in one go
7. Copy the short link
8. Show its QR code
9. Delete the link

Links that have expired, been disabled, or used up their one-time click stay in the
database — expiry is a soft check (the redirect returns `410 Gone`; the row isn't
deleted). The dashboard flags them with a status badge and a muted, struck-through
row, and adds a **Hide inactive** toggle plus a **Delete inactive** button to clear
them out in bulk. The per-row **Delete** still removes a single link.

## Layout

- `shared/`: framework-free validation (Zod schemas, slug rules, URL safety), used by both the worker and the extension
- `worker/`: the Cloudflare Worker (Hono routes, D1 access, auth, and the safety pipeline)
- `extension/`: cross-browser (Chrome + Firefox) MV3 extension — see [extension/README.md](./extension/README.md)

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free plan works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler` or use `npx`)
- A domain on Cloudflare (for your short-link hostname)

## Develop

```bash
npm install
cp worker/.dev.vars.example worker/.dev.vars   # fill in API_TOKEN, SHORT_DOMAIN, etc.
npm --workspace worker run migrate:local
npm --workspace worker run dev
npm test
```

## Deploy

See the full [deploy guide](./guide/DEPLOY.md) for step-by-step instructions covering:

1. Configuring `wrangler.toml` (replace the D1 database ID placeholder)
2. Setting up the D1 database
3. Configuring secrets (API_TOKEN, SHORT_DOMAIN, SAFE_BROWSING_API_KEY)
4. Connecting your custom domain
5. Locking down `/admin` and `/api` with Cloudflare Access

Quick start:

```bash
# 1. Create the D1 database
npx wrangler d1 create url_shortener
# 2. Copy the printed database_id into worker/wrangler.toml
# 3. Run migrations against the remote database
npm --workspace worker run migrate:remote
# 4. Set the API token secret
npx wrangler secret put API_TOKEN --config worker/wrangler.toml
# 5. Set the short domain secret
npx wrangler secret put SHORT_DOMAIN --config worker/wrangler.toml
# 6. Deploy the worker
npm run deploy
```

## Documentation

- [Architecture](./guide/ARCHITECTURE.md) — system diagram, request flows, package breakdown
- [Deploy guide](./guide/DEPLOY.md) — full setup, secrets, domain, and Cloudflare Access
- [Cost](./guide/COST.md) — free tier limits and pricing breakdown
- [Extension](./extension/README.md) — browser extension setup

## Notes

- Link search uses `LIKE '%term%'` (a full table scan) on purpose — at single-user
  scale the table is small and the scan is sub-millisecond. If it ever grows large,
  switch to an FTS5 `trigram` virtual table kept in sync with triggers (mind the
  3-character minimum and D1's no-export-for-virtual-tables caveat).

## License

MIT. See [LICENSE](./LICENSE).

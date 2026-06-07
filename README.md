# Stem

**an edge URL shortener**

A single-user URL shortener that runs on Cloudflare Workers (Hono + D1), with a
Chrome-compatible browser extension. MIT licensed.

**No secrets live in this repo.** Every credential, including your short-link
hostname, is set at deploy time through Wrangler Secrets or the Cloudflare
dashboard.

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
5. Copy the short link
6. Show its QR code
7. Delete the link

## Layout
- `shared/`: framework-free validation (Zod schemas, slug rules, URL safety), used by both the worker and the extension
- `worker/`: the Cloudflare Worker (Hono routes, D1 access, auth, and the safety pipeline)
- `extension/`: cross-browser (Chrome + Firefox) MV3 extension — see [extension/README.md](./extension/README.md)

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

## Lock down /admin and /api with Cloudflare Access
In the Cloudflare Zero Trust dashboard, create an Access application that covers
`/admin*` and `/api/*` on your domain and restrict it to your own identity. Set
the worker secrets `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` so the worker also
verifies the Access JWT itself, as a second layer of defense.



## Notes
- Link search uses `LIKE '%term%'` (a full table scan) on purpose — at single-user
  scale the table is small and the scan is sub-millisecond. If it ever grows large,
  switch to an FTS5 `trigram` virtual table kept in sync with triggers (mind the
  3-character minimum and D1's no-export-for-virtual-tables caveat).

## License
MIT. See [LICENSE](./LICENSE).

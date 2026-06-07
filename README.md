# url-shortener

A single-user URL shortener that runs on Cloudflare Workers (Hono + D1), with a
cross-browser extension as a separate project. MIT licensed.

**No secrets live in this repo.** Every credential, including your short-link
hostname, is set at deploy time through Wrangler Secrets or the Cloudflare
dashboard.

## What it does
- Redirects with 302, so disabling or expiring a link takes effect right away, and counts clicks without storing IPs or per-visitor logs
- Exposes a REST API at `/api/links`. The worker verifies either a scoped Bearer token or a Cloudflare Access JWT; put Access in front of `/api` and clients (browser dashboard, extension via an Access service token) authenticate through it
- Checks every destination before saving it: scheme allowlist, normalization, private/internal-host (SSRF) blocking, a self-reference block, and a pluggable reputation lookup (Google Safe Browsing by default)
- Supports links that expire on a date or self-destruct after N clicks
- Ships an admin dashboard at `/admin`

## Layout
- `shared/`: framework-free validation (Zod schemas, slug rules, URL safety), used by both the worker and the extension
- `worker/`: the Cloudflare Worker (Hono routes, D1 access, auth, and the safety pipeline)

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

## Browser extension
A Chrome + Firefox (MV3) extension lives in `extension/`. It shortens the current
tab against your worker, authenticating through Cloudflare Access with a **service
token**.

Setup:
1. In Cloudflare Zero Trust → Access → Service Auth, create a service token, and add
   a Service Auth policy to your URL-Shortener Access app that allows it.
2. `npm run build:ext` → load `extension/dist/chrome` (Chrome: Load unpacked) or
   `extension/dist/firefox` (Firefox: about:debugging → Load Temporary Add-on).
3. Open the extension's Options, enter your server URL and the service token's
   Client ID + Secret, and grant the host permission when prompted.

## Notes
- Link search uses `LIKE '%term%'` (a full table scan) on purpose — at single-user
  scale the table is small and the scan is sub-millisecond. If it ever grows large,
  switch to an FTS5 `trigram` virtual table kept in sync with triggers (mind the
  3-character minimum and D1's no-export-for-virtual-tables caveat).

## License
MIT. See [LICENSE](./LICENSE).

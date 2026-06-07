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
token** (since `/api` is behind Access, a plain bearer token can't pass the edge).

### 1. Create the Access service token
1. Zero Trust → **Access → Service Auth → Create Service Token**. Name it (e.g.
   `url-shorten-extension`) and **copy the Client ID and Client Secret** — the
   secret is shown only once. The Client ID ends in `.access`.
2. Open the Access **application** that protects your short domain (the one covering
   `/admin*` and `/api/*`) → **Policies → Add a policy**:
   - **Action must be `Service Auth`**, *not* `Allow`. An `Allow` policy with a
     service token still expects an interactive login and will be rejected with
     `service_token_status:false`. (Cloudflare's UI warns about this.)
   - **Include → Service Token →** your token.

### 2. Build and load
```bash
npm run build:ext
```
- **Chrome/Brave/Edge:** `chrome://extensions` → enable **Developer mode** → **Load
  unpacked** → select `extension/dist/chrome`. After a rebuild, click the card's ↻.
- **Firefox:** `about:debugging#/runtime/this-firefox` → **Load Temporary Add-on** →
  pick `extension/dist/firefox/manifest.json` (temporary; gone on restart).

### 3. Configure
Open the extension → **⚙** (or right-click the icon → Options) and enter, each value
pasted verbatim (no header names, no trimming):
- **Server URL:** your short domain, e.g. `https://l.example.com` (the redirect
  host, not the apex).
- **Access Client ID:** the full value including the `.access` suffix.
- **Access Client Secret:** the full secret.

Click **Save**, then **approve the host-permission prompt**. If it didn't prompt,
enable it manually: `chrome://extensions` → the extension → **Details → Site access**
→ turn on the toggle next to your domain. Use **Test connection** to confirm — a
green ✓ means the token, policy, and permission are all good.

### Troubleshooting
- **"Failed to fetch"** → the host permission isn't granted for your domain (enable
  the Site access toggle), or the Server URL points at the wrong host.
- **"Access rejected — login redirect"** → the Access policy isn't `Service Auth`,
  or the token isn't on the app covering `/api/*`. Verify with:
  ```bash
  curl -sS -o /dev/null -w "%{http_code}\n" \
    -H "CF-Access-Client-Id: <id>.access" -H "CF-Access-Client-Secret: <secret>" \
    https://your-short-domain/api/links   # want 200
  ```

## Notes
- Link search uses `LIKE '%term%'` (a full table scan) on purpose — at single-user
  scale the table is small and the scan is sub-millisecond. If it ever grows large,
  switch to an FTS5 `trigram` virtual table kept in sync with triggers (mind the
  3-character minimum and D1's no-export-for-virtual-tables caveat).

## License
MIT. See [LICENSE](./LICENSE).

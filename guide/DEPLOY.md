# Deploy

## Prerequisites

- [Node.js](https://nodejs.org/) v20+
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free plan works)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (`npm install -g wrangler` or use `npx`)
- A domain on Cloudflare (for your short-link hostname)

## 1. Configure `wrangler.toml`

The repo ships `worker/wrangler.toml` with a placeholder for the database ID.
After creating the D1 database (step 2), replace `REPLACE_WITH_YOUR_D1_ID` with
your actual database ID:

```toml
[[d1_databases]]
binding = "DB"
database_name = "url_shortener"
database_id = "REPLACE_WITH_YOUR_D1_ID"  # from `wrangler d1 create url_shortener`
```

> **Important:** The `binding` must be `"DB"` — that's what the code uses (`env.DB`).

## 2. Create the D1 database

```bash
npx wrangler d1 create url_shortener
```

Copy the printed `database_id` into your `wrangler.toml`.

## 3. Apply migrations

```bash
npm --workspace worker run migrate:remote
```

## 4. Set secrets

```bash
npx wrangler secret put API_TOKEN --config worker/wrangler.toml
npx wrangler secret put SHORT_DOMAIN --config worker/wrangler.toml
npx wrangler secret put SAFE_BROWSING_API_KEY --config worker/wrangler.toml  # optional
```

> **Tip:** Pipe values to skip the interactive prompt:
>
> ```bash
> echo "my-secret-value" | npx wrangler secret put API_TOKEN --config worker/wrangler.toml
> ```

<!-- -->

> **Note:** Wrangler looks for `wrangler.toml` in the current directory. Either
> run commands from the `worker/` folder, or pass `--config worker/wrangler.toml`
> from the repo root.

### About the secrets

- **`API_TOKEN`** — A secret bearer token you create yourself (any strong random
  string). The worker checks `Authorization: Bearer <token>` headers against this
  value. Use the same token in the extension settings or any HTTP client that calls
  `/api/links`. Generate one with `openssl rand -base64 32` or `npx auth secret`.

- **`SHORT_DOMAIN`** — The hostname for your short links (e.g. `l.example.com`).

- **`SAFE_BROWSING_API_KEY`** (optional) — A Google Safe Browsing API v4 key, used
  to check destination URLs for malware/phishing before saving. It's
  [free with no usage limits](https://developers.google.com/safe-browsing/v4/pricing).
  To get one: Google Cloud Console → enable the "Safe Browsing API" → Credentials →
  Create API Key → restrict it to only the "Safe Browsing API" in the API
  restrictions dropdown. If omitted, the reputation check is skipped (links are saved
  without the lookup). You can also set `REPUTATION_PROVIDER = "none"` in `[vars]`
  to opt out explicitly.

## 5. Connect your custom domain

In the [Cloudflare dashboard](https://dash.cloudflare.com/):

1. Go to **Compute** → **Workers & Pages**
2. Click your **url-shortener** worker
3. Go to the **Domains** tab
4. Click **+ Add Domain**
5. Enter your short-link hostname (the same value you set as `SHORT_DOMAIN`)

Cloudflare creates the DNS record automatically. Once active, your worker handles
all traffic on that domain.

## 6. Deploy

```bash
npm run deploy
```

Your admin dashboard is now at `https://<your-short-domain>/admin` (requires
auth — see below).

## Lock down /admin and /api with Cloudflare Access

The `/admin` page and `/api/*` endpoints require authentication. The worker
supports two methods: a Bearer token (for programmatic access) and Cloudflare
Access JWTs (for browser sessions). Setting up Access gives you a proper login
flow in the browser.

### Set up the Access application

1. Go to the [Zero Trust dashboard](https://one.dash.cloudflare.com)
2. In the sidebar, go to **Integrations** → **Identity providers** — confirm
   "One-time PIN" is enabled (it is by default), or add Google/GitHub
3. Go to **Access controls** → **Applications** → **Create new application**
4. Select **Self-hosted and private** → choose the **Public DNS** tab →
   click **Continue with Self-hosted and private**
5. Configure destinations — add your domain with two paths:
   - `your-short-domain` / path: `admin`
   - `your-short-domain` / path: `api`
6. Create an **Allow** policy restricted to your email address
7. Save the application

### Get the AUD tag

After saving, open the application → **Additional settings** tab → **AUD tag** →
copy the **Token** value.

### Set the worker secrets

Your team domain is `<team-name>.cloudflareaccess.com` (visible in the Zero Trust
dashboard URL or under Settings).

```bash
echo "your-team.cloudflareaccess.com" | npx wrangler secret put ACCESS_TEAM_DOMAIN --config worker/wrangler.toml
echo "your-aud-tag" | npx wrangler secret put ACCESS_AUD --config worker/wrangler.toml
```

### Redeploy

```bash
npm run deploy
```

Now visiting `/admin` in the browser triggers a Cloudflare Access login page.
After authenticating, the worker validates the Access JWT as a second layer of
defense.

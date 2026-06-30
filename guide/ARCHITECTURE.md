# Architecture

## Overview

Stem is a single-user URL shortener deployed as a Cloudflare Worker. The system
has three main components: a Worker (API + redirect + admin), a shared validation
library, and a browser extension.

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                         │
├──────────────────┬──────────────────────┬───────────────────────────────────┤
│  Browser (user)  │  Browser Extension   │  Admin Dashboard (/admin)         │
│  clicks short    │  (Chrome/Firefox)    │  (served by worker, calls /api)   │
│  link            │                      │                                   │
└────────┬─────────┴──────────┬───────────┴────────────────┬──────────────────┘
         │                    │                            │
         │ GET /:slug         │ POST/GET /api/links        │ POST/GET/PATCH/DELETE /api/*
         │ (public)           │ + CF-Access headers        │ + Access JWT (browser session)
         │                    │                            │
─────────▼────────────────────▼────────────────────────────▼───────────────────
│                    Cloudflare Workers (Hono)                                  │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                        index.ts (router)                             │    │
│  │                                                                     │    │
│  │  GET /healthz ──────────────────────────────────────► "ok"          │    │
│  │                                                                     │    │
│  │  /admin ──► requireAuth ──► admin.ts (serves HTML SPA)              │    │
│  │                                                                     │    │
│  │  /api/* ──► requireAuth ──► api.ts (CRUD + QR endpoint)             │    │
│  │                                                                     │    │
│  │  /:slug ──► redirect.ts (public, no auth)                           │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
│  ┌─────────── Auth (middleware/auth.ts) ───────────┐                        │
│  │  Option A: Bearer token (API_TOKEN secret)      │                        │
│  │  Option B: Cloudflare Access JWT verification   │                        │
│  └─────────────────────────────────────────────────┘                        │
│                                                                              │
│  ┌─────────── Safety Pipeline (on link creation) ──────────────────────┐    │
│  │  1. Static checks (shared/url-safety.ts)                            │    │
│  │     └─ scheme allowlist, length, private/internal host block        │    │
│  │  2. Strip tracking params (shared/tracking.ts)                      │    │
│  │     └─ removes utm_*, fbclid, Amazon affiliate params, etc.         │    │
│  │  3. Self-reference check                                            │    │
│  │     └─ rejects URLs pointing back at SHORT_DOMAIN                   │    │
│  │  4. Reputation lookup (worker/lib/reputation.ts)                    │    │
│  │     └─ Google Safe Browsing / Cloudflare Intel / none (fails open)  │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│                                                                              │
──────────────────────────────────────┬────────────────────────────────────────
                                      │
                                      ▼
                          ┌───────────────────────┐
                          │   Cloudflare D1        │
                          │   (SQLite)             │
                          │                        │
                          │   links table:         │
                          │   ├─ slug (PK)         │
                          │   ├─ url               │
                          │   ├─ created_at        │
                          │   ├─ expires_at        │
                          │   ├─ max_clicks        │
                          │   ├─ click_count       │
                          │   ├─ last_clicked      │
                          │   └─ disabled          │
                          └───────────────────────┘
```

## Request flows

### Redirect (public)

`GET /:slug` → look up in D1 → check if dead (disabled / expired / max clicks
reached) → if dead return `410 Gone`, otherwise `302` redirect + async click
count increment via `waitUntil`.

### Create link (authenticated)

`POST /api/links` → auth check → Zod schema validation → safety pipeline
(static checks → strip trackers → self-ref block → reputation API) → generate
or validate slug → insert into D1 → return link + short URL + list of stripped
trackers.

### Admin dashboard

`GET /admin` → auth check → serves a self-contained HTML page. The page's
JavaScript calls `/api/*` endpoints from the browser (same-origin, so the
Cloudflare Access session cookie handles auth automatically).

## Packages

### `shared/` (@url-shortener/shared)

Framework-free code used by both the worker and the extension:

- **types.ts** — `Link`, `CreateLinkInput`, `PatchLinkInput` interfaces
- **schema.ts** — Zod validation schemas
- **slug.ts** — slug generation + validation
- **url-safety.ts** — static URL checks (scheme, length, private hosts)
- **tracking.ts** — tracking/affiliate param stripping
- **qr.ts** + **qr-presets.ts** — QR code SVG generation

### `worker/`

The Cloudflare Worker:

- **src/index.ts** — Hono app, route registration, global error handler
- **src/routes/redirect.ts** — public `/:slug` redirect
- **src/routes/api.ts** — REST API (`/api/links` CRUD + QR endpoint)
- **src/routes/admin.ts** — serves the admin HTML SPA
- **src/middleware/auth.ts** — Bearer token + Access JWT verification
- **src/lib/safety.ts** — orchestrates the full safety pipeline
- **src/lib/reputation.ts** — Google Safe Browsing / Cloudflare Intel calls
- **src/lib/db.ts** — D1 query layer (insert, get, list, search, patch, delete)

### `extension/`

Cross-browser (Chrome + Firefox) MV3 extension:

- Communicates with the worker via `/api/links` endpoints
- Authenticates using Cloudflare Access service token headers
- Renders QR codes client-side using the shared `qr.ts` module
- Provides a popup for quick link shortening from the current tab

## Auth model

The worker supports two authentication methods (checked in order):

1. **Bearer token** — `Authorization: Bearer <API_TOKEN>`. Compared using
   constant-time equality. Used for programmatic access.
2. **Cloudflare Access JWT** — `Cf-Access-Jwt-Assertion` header verified against
   the team's JWKS endpoint. Used for browser sessions (admin dashboard) and
   extension access via service tokens.

If neither passes, the request gets a `401 Unauthorized` response.

## Database

Single SQLite table in Cloudflare D1:

```sql
CREATE TABLE links (
  slug          TEXT PRIMARY KEY,
  url           TEXT NOT NULL,
  created_at    INTEGER NOT NULL,
  expires_at    INTEGER,
  max_clicks    INTEGER,
  click_count   INTEGER NOT NULL DEFAULT 0,
  last_clicked  INTEGER,
  disabled      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_links_created ON links(created_at DESC);
```

Expiry is a soft check — expired/disabled links return `410 Gone` but remain
in the database until explicitly deleted.

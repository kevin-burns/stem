import type { Hono } from "hono";
import { createLinkSchema, patchLinkSchema, generateSlug } from "@url-shortener/shared";
import type { Env } from "../env.js";
import { requireAuth } from "../middleware/auth.js";
import { checkUrlSafety } from "../lib/safety.js";
import { nowSeconds } from "../lib/time.js";
import { insertLink, getLink, listLinks, patchLink, deleteLink } from "../lib/db.js";

const MAX_SLUG_RETRIES = 5;

function shortUrl(env: Env, slug: string): string {
  return `https://${env.SHORT_DOMAIN}/${slug}`;
}

export function registerApi(app: Hono<{ Bindings: Env }>): void {
  app.use("/api/*", requireAuth);

  app.post("/api/links", async (c) => {
    let json: unknown;
    try {
      json = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }
    const parsed = createLinkSchema.safeParse(json);
    if (!parsed.success) {
      return c.json({ error: "Invalid request", reason: parsed.error.issues[0]?.message }, 400);
    }
    const body = parsed.data;

    const safety = await checkUrlSafety(body.url, c.env);
    if (!safety.ok || !safety.normalized) {
      return c.json({ error: "Unsafe URL", reason: safety.reason ?? "rejected" }, 422);
    }

    const now = nowSeconds();
    const record = {
      url: safety.normalized,
      created_at: now,
      expires_at: body.expires_at ?? null,
      max_clicks: body.max_clicks ?? null,
    };

    if (body.slug) {
      if (await getLink(c.env.DB, body.slug)) return c.json({ error: "Slug already exists" }, 409);
      await insertLink(c.env.DB, { slug: body.slug, ...record });
      return c.json({ ...(await getLink(c.env.DB, body.slug))!, short_url: shortUrl(c.env, body.slug) }, 201);
    }

    for (let i = 0; i < MAX_SLUG_RETRIES; i++) {
      const slug = generateSlug();
      if (await getLink(c.env.DB, slug)) continue;
      await insertLink(c.env.DB, { slug, ...record });
      return c.json({ ...(await getLink(c.env.DB, slug))!, short_url: shortUrl(c.env, slug) }, 201);
    }
    return c.json({ error: "Could not allocate a unique slug" }, 500);
  });

  app.get("/api/links", async (c) => {
    const raw = Number(c.req.query("limit") ?? "50");
    const limit = Math.min(Math.max(Number.isFinite(raw) ? raw : 50, 1), 100);
    const links = await listLinks(c.env.DB, limit);
    return c.json({ links });
  });

  app.get("/api/links/:slug", async (c) => {
    const link = await getLink(c.env.DB, c.req.param("slug"));
    if (!link) return c.json({ error: "Not found" }, 404);
    return c.json({ ...link, short_url: shortUrl(c.env, link.slug) });
  });

  app.patch("/api/links/:slug", async (c) => {
    const slug = c.req.param("slug");
    if (!(await getLink(c.env.DB, slug))) return c.json({ error: "Not found" }, 404);
    let json: unknown;
    try {
      json = await c.req.json();
    } catch {
      return c.json({ error: "Invalid JSON" }, 400);
    }
    const parsed = patchLinkSchema.safeParse(json);
    if (!parsed.success) {
      return c.json({ error: "Invalid request", reason: parsed.error.issues[0]?.message }, 400);
    }
    await patchLink(c.env.DB, slug, parsed.data);
    return c.json({ ...(await getLink(c.env.DB, slug))!, short_url: shortUrl(c.env, slug) });
  });

  app.delete("/api/links/:slug", async (c) => {
    const slug = c.req.param("slug");
    if (!(await getLink(c.env.DB, slug))) return c.json({ error: "Not found" }, 404);
    await deleteLink(c.env.DB, slug);
    return c.body(null, 204);
  });
}

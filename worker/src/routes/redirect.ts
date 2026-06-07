import type { Hono } from "hono";
import type { Env } from "../env.js";
import { getLink, recordClick } from "../lib/db.js";
import { nowSeconds } from "../lib/time.js";

export function registerRedirect(app: Hono<{ Bindings: Env }>): void {
  app.get("/:slug", async (c) => {
    const slug = c.req.param("slug");
    const link = await getLink(c.env.DB, slug);
    if (!link) return c.notFound();

    const now = nowSeconds();
    const dead =
      link.disabled ||
      (link.expires_at !== null && now > link.expires_at) ||
      (link.max_clicks !== null && link.click_count >= link.max_clicks);
    if (dead) return c.text("Gone", 410);

    // Count asynchronously so the redirect is never delayed.
    const clickPromise = recordClick(c.env.DB, slug, now);
    try {
      c.executionCtx.waitUntil(clickPromise);
    } catch {
      await clickPromise;
    }
    return c.redirect(link.url, 302);
  });
}

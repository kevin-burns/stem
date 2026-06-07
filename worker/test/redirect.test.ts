import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import { registerRedirect } from "../src/routes/redirect.js";
import { insertLink, getLink, patchLink } from "../src/lib/db.js";
import type { Env } from "../src/env.js";

function app() {
  const a = new Hono<{ Bindings: Env }>();
  registerRedirect(a);
  return a;
}
const base = { url: "https://example.com", created_at: 1000, expires_at: null, max_clicks: null };

beforeEach(async () => {
  await env.DB.exec("DELETE FROM links");
});

describe("GET /:slug", () => {
  it("302-redirects a live link to its destination", async () => {
    await insertLink(env.DB, { slug: "abc", ...base });
    const res = await app().request("/abc", { redirect: "manual" }, env);
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://example.com");
  });

  it("increments the click count after redirect", async () => {
    await insertLink(env.DB, { slug: "abc", ...base });
    await app().request("/abc", { redirect: "manual" }, env);
    const link = await getLink(env.DB, "abc");
    expect(link?.click_count).toBe(1);
  });

  it("404s an unknown slug", async () => {
    const res = await app().request("/missing", { redirect: "manual" }, env);
    expect(res.status).toBe(404);
  });

  it("410s a disabled link", async () => {
    await insertLink(env.DB, { slug: "abc", ...base });
    await patchLink(env.DB, "abc", { disabled: true });
    const res = await app().request("/abc", { redirect: "manual" }, env);
    expect(res.status).toBe(410);
  });

  it("410s an expired link", async () => {
    await insertLink(env.DB, { slug: "abc", ...base, expires_at: 1 });
    const res = await app().request("/abc", { redirect: "manual" }, env);
    expect(res.status).toBe(410);
  });

  it("410s a link that reached max_clicks", async () => {
    await insertLink(env.DB, { slug: "abc", ...base, max_clicks: 1 });
    await app().request("/abc", { redirect: "manual" }, env); // first click
    const res = await app().request("/abc", { redirect: "manual" }, env); // second
    expect(res.status).toBe(410);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import { registerApi } from "../src/routes/api.js";
import { insertLink } from "../src/lib/db.js";
import type { Env } from "../src/env.js";

const AUTH = { Authorization: "Bearer test-token", "content-type": "application/json" };

function app() {
  const a = new Hono<{ Bindings: Env }>();
  registerApi(a);
  return a;
}
const post = (body: unknown) =>
  app().request("/api/links", { method: "POST", headers: AUTH, body: JSON.stringify(body) }, env);

beforeEach(async () => {
  await env.DB.exec("DELETE FROM links");
});

describe("POST /api/links", () => {
  it("requires auth", async () => {
    const res = await app().request(
      "/api/links",
      { method: "POST", headers: { "content-type": "application/json" }, body: "{}" },
      env,
    );
    expect(res.status).toBe(401);
  });

  it("creates a link with a generated slug", async () => {
    const res = await post({ url: "https://example.com" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { slug: string; short_url: string };
    expect(body.slug).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(body.short_url).toBe(`https://l.example.com/${body.slug}`);
  });

  it("honors a custom slug", async () => {
    const res = await post({ url: "https://example.com", slug: "mine" });
    expect(res.status).toBe(201);
    expect(((await res.json()) as { slug: string }).slug).toBe("mine");
  });

  it("strips tracking params on create, stores the clean URL, reports them", async () => {
    const res = await post({ url: "https://example.com/p?utm_source=x&gclid=1&keep=2", slug: "clean" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { url: string; stripped: string[] };
    expect(body.url).toBe("https://example.com/p?keep=2");
    expect(body.stripped.sort()).toEqual(["gclid", "utm_source"]);
  });

  it("409s on a duplicate slug", async () => {
    await post({ url: "https://example.com", slug: "dup" });
    const res = await post({ url: "https://example.com", slug: "dup" });
    expect(res.status).toBe(409);
  });

  it("400s on a malformed body", async () => {
    const res = await post({ slug: "no-url" });
    expect(res.status).toBe(400);
  });

  it("422s on an unsafe destination", async () => {
    const res = await post({ url: "http://127.0.0.1/admin" });
    expect(res.status).toBe(422);
    expect(((await res.json()) as { reason: string }).reason).toMatch(/private|internal/i);
  });
});

describe("GET/PATCH/DELETE /api/links", () => {
  it("lists recent links newest-first", async () => {
    await insertLink(env.DB, { slug: "a", url: "https://a.com", created_at: 1, expires_at: null, max_clicks: null });
    await insertLink(env.DB, { slug: "b", url: "https://b.com", created_at: 2, expires_at: null, max_clicks: null });
    const res = await app().request("/api/links", { headers: AUTH }, env);
    const body = (await res.json()) as { links: { slug: string }[] };
    expect(body.links.map((l) => l.slug)).toEqual(["b", "a"]);
  });

  it("gets a single link and 404s a missing one", async () => {
    await post({ url: "https://example.com", slug: "one" });
    expect((await app().request("/api/links/one", { headers: AUTH }, env)).status).toBe(200);
    expect((await app().request("/api/links/nope", { headers: AUTH }, env)).status).toBe(404);
  });

  it("patches a link", async () => {
    await post({ url: "https://example.com", slug: "p" });
    const res = await app().request(
      "/api/links/p",
      { method: "PATCH", headers: AUTH, body: JSON.stringify({ disabled: true }) },
      env,
    );
    expect(res.status).toBe(200);
    expect(((await res.json()) as { disabled: boolean }).disabled).toBe(true);
  });

  it("deletes a link", async () => {
    await post({ url: "https://example.com", slug: "d" });
    const res = await app().request("/api/links/d", { method: "DELETE", headers: AUTH }, env);
    expect(res.status).toBe(204);
    expect((await app().request("/api/links/d", { headers: AUTH }, env)).status).toBe(404);
  });
});

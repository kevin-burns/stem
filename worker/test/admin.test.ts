import { describe, it, expect } from "vitest";
import { env } from "cloudflare:test";
import { Hono } from "hono";
import { registerAdmin } from "../src/routes/admin.js";
import { requireAuth } from "../src/middleware/auth.js";
import type { Env } from "../src/env.js";

function app() {
  const a = new Hono<{ Bindings: Env }>();
  a.use("/admin", requireAuth);
  registerAdmin(a);
  return a;
}

describe("GET /admin", () => {
  it("requires auth", async () => {
    const res = await app().request("/admin", {}, env);
    expect(res.status).toBe(401);
  });

  it("returns the dashboard HTML when authorized", async () => {
    const res = await app().request("/admin", { headers: { Authorization: "Bearer test-token" } }, env);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/html/);
    expect(await res.text()).toMatch(/<title>/i);
  });

  it("escapes dynamic row values (defense-in-depth)", async () => {
    const res = await app().request("/admin", { headers: { Authorization: "Bearer test-token" } }, env);
    const body = await res.text();
    expect(body).toContain("function escapeHtml");
    expect(body).toContain("escapeHtml(l.slug)");
    expect(body).toContain("escapeHtml(l.url)");
  });

  it("offers a copy-short-link button per row", async () => {
    const res = await app().request("/admin", { headers: { Authorization: "Bearer test-token" } }, env);
    const body = await res.text();
    expect(body).toContain("class='copy");
    expect(body).toContain("navigator.clipboard.writeText");
    expect(body).toContain('location.origin + "/" + b.dataset.copy');
  });

  it("surfaces stripped trackers in the create confirmation", async () => {
    const res = await app().request("/admin", { headers: { Authorization: "Bearer test-token" } }, env);
    const body = await res.text();
    expect(body).toContain("data.stripped");
    expect(body).toContain("stripped ");
  });

  it("includes a debounced search box that queries ?q=", async () => {
    const res = await app().request("/admin", { headers: { Authorization: "Bearer test-token" } }, env);
    const body = await res.text();
    expect(body).toContain('id="search"');
    expect(body).toContain('"?q=" + encodeURIComponent(q)');
    expect(body).toContain("setTimeout(load");
  });

  it("offers a QR button per row that opens the slug's qr endpoint", async () => {
    const res = await app().request("/admin", { headers: { Authorization: "Bearer test-token" } }, env);
    const body = await res.text();
    expect(body).toContain("class='qr");
    expect(body).toContain('"/api/links/" + encodeURIComponent(b.dataset.qr) + "/qr"');
    expect(body).toContain('id="qrModal"');
  });

  it("lets you copy the QR modal image to the clipboard", async () => {
    const res = await app().request("/admin", { headers: { Authorization: "Bearer test-token" } }, env);
    const body = await res.text();
    expect(body).toContain('id="qrCopy"');
    expect(body).toContain("ClipboardItem");
    expect(body).toContain("canvas.toBlob");
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import { SELF, env } from "cloudflare:test";

beforeEach(async () => {
  await env.DB.exec("DELETE FROM links");
});

describe("worker entrypoint (full app via SELF)", () => {
  it("serves health check", async () => {
    const res = await SELF.fetch("https://l.example.com/healthz");
    expect(await res.text()).toBe("ok");
  });

  it("end-to-end: create via API then redirect", async () => {
    const create = await SELF.fetch("https://l.example.com/api/links", {
      method: "POST",
      headers: { Authorization: "Bearer test-token", "content-type": "application/json" },
      body: JSON.stringify({ url: "https://example.com", slug: "e2e" }),
    });
    expect(create.status).toBe(201);
    const res = await SELF.fetch("https://l.example.com/e2e", { redirect: "manual" });
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://example.com/");
  });

  it("admin is protected without a credential", async () => {
    const res = await SELF.fetch("https://l.example.com/admin");
    expect(res.status).toBe(401);
  });

  it("unknown route surfaces a 404 redirect surface", async () => {
    const res = await SELF.fetch("https://l.example.com/does-not-exist", { redirect: "manual" });
    expect(res.status).toBe(404);
  });
});

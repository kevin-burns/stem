import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { requireAuth } from "../src/middleware/auth.js";
import type { Env } from "../src/env.js";

function appWith(token: string) {
  const app = new Hono<{ Bindings: Env }>();
  app.use("/api/*", requireAuth);
  app.get("/api/ping", (c) => c.text("pong"));
  return (init: RequestInit) =>
    app.request("/api/ping", init, { API_TOKEN: token, ACCESS_AUD: "", ACCESS_TEAM_DOMAIN: "" } as Env);
}

describe("requireAuth", () => {
  it("accepts the correct bearer token", async () => {
    const res = await appWith("secret")({ headers: { Authorization: "Bearer secret" } });
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("pong");
  });

  it("rejects a wrong token", async () => {
    const res = await appWith("secret")({ headers: { Authorization: "Bearer nope" } });
    expect(res.status).toBe(401);
  });

  it("rejects a missing credential", async () => {
    const res = await appWith("secret")({});
    expect(res.status).toBe(401);
  });
});

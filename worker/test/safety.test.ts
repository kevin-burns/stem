import { describe, it, expect, vi, afterEach } from "vitest";
import { checkUrlSafety } from "../src/lib/safety.js";
import type { Env } from "../src/env.js";

const env = {
  REPUTATION_PROVIDER: "none",
  SHORT_DOMAIN: "l.example.com",
} as unknown as Env;

afterEach(() => vi.restoreAllMocks());

describe("checkUrlSafety", () => {
  it("accepts a public URL and returns the normalized form", async () => {
    const r = await checkUrlSafety("https://Example.com/a", env);
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe("https://example.com/a");
  });

  it("strips tracking params and reports what was removed", async () => {
    const r = await checkUrlSafety("https://example.com/p?utm_source=x&gclid=1&id=42", env);
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe("https://example.com/p?id=42");
    expect(r.removed?.sort()).toEqual(["gclid", "utm_source"]);
  });

  it("rejects static-unsafe URLs before calling reputation", async () => {
    const r = await checkUrlSafety("javascript:alert(1)", env);
    expect(r.ok).toBe(false);
  });

  it("rejects self-referential URLs (the short domain itself)", async () => {
    const r = await checkUrlSafety("https://l.example.com/abc", env);
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/itself|self/i);
  });

  it("surfaces a reputation rejection", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ matches: [{ threatType: "MALWARE" }] }), { status: 200 }),
    );
    const r = await checkUrlSafety("https://bad.example", {
      ...env,
      REPUTATION_PROVIDER: "google-safe-browsing",
      SAFE_BROWSING_API_KEY: "key",
    });
    expect(r.ok).toBe(false);
  });
});

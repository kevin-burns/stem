import { describe, it, expect, vi, afterEach } from "vitest";
import { reputationCheck } from "../src/lib/reputation.js";
import type { Env } from "../src/env.js";

const baseEnv = {
  DB: {} as never,
  API_TOKEN: "t",
  SHORT_DOMAIN: "l.example.com",
} as unknown as Env;

afterEach(() => vi.restoreAllMocks());

describe("reputationCheck", () => {
  it("returns ok for provider 'none'", async () => {
    const r = await reputationCheck("https://example.com", { ...baseEnv, REPUTATION_PROVIDER: "none" });
    expect(r.ok).toBe(true);
  });

  it("falls back to ok when google-safe-browsing has no key", async () => {
    const r = await reputationCheck("https://example.com", {
      ...baseEnv,
      REPUTATION_PROVIDER: "google-safe-browsing",
    });
    expect(r.ok).toBe(true);
  });

  it("rejects a URL flagged by Safe Browsing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ matches: [{ threatType: "MALWARE" }] }), { status: 200 }),
    );
    const r = await reputationCheck("https://bad.example", {
      ...baseEnv,
      REPUTATION_PROVIDER: "google-safe-browsing",
      SAFE_BROWSING_API_KEY: "key",
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/MALWARE/);
  });

  it("passes a clean URL through Safe Browsing", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    const r = await reputationCheck("https://good.example", {
      ...baseEnv,
      REPUTATION_PROVIDER: "google-safe-browsing",
      SAFE_BROWSING_API_KEY: "key",
    });
    expect(r.ok).toBe(true);
  });

  it("fails open when the provider errors", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network"));
    const r = await reputationCheck("https://x.example", {
      ...baseEnv,
      REPUTATION_PROVIDER: "google-safe-browsing",
      SAFE_BROWSING_API_KEY: "key",
    });
    expect(r.ok).toBe(true);
  });

  it("rejects a domain flagged by cloudflare-intel", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(
        JSON.stringify({ result: { security_categories: [{ name: "Phishing" }] } }),
        { status: 200 },
      ),
    );
    const r = await reputationCheck("https://phish.example", {
      ...baseEnv,
      REPUTATION_PROVIDER: "cloudflare-intel",
      CF_INTEL_TOKEN: "tok",
      CF_ACCOUNT_ID: "acct",
    });
    expect(r.ok).toBe(false);
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";

const store: Record<string, unknown> = {};
vi.mock("../src/lib/browser.js", () => ({
  default: {
    storage: {
      local: {
        get: vi.fn(async (keys: string[]) => {
          const out: Record<string, unknown> = {};
          for (const k of keys) if (k in store) out[k] = store[k];
          return out;
        }),
        set: vi.fn(async (obj: Record<string, unknown>) => {
          Object.assign(store, obj);
        }),
      },
    },
  },
}));

import { getSettings, saveSettings, isConfigured } from "../src/lib/settings.js";

beforeEach(() => {
  for (const k of Object.keys(store)) delete store[k];
});

describe("settings", () => {
  it("round-trips settings through storage", async () => {
    await saveSettings({ serverUrl: "https://l.example.com", accessClientId: "id", accessClientSecret: "sec" });
    expect(await getSettings()).toEqual({
      serverUrl: "https://l.example.com",
      accessClientId: "id",
      accessClientSecret: "sec",
    });
  });

  it("defaults missing fields to empty strings", async () => {
    expect(await getSettings()).toEqual({ serverUrl: "", accessClientId: "", accessClientSecret: "" });
  });

  it("reports configured only when all fields are present", () => {
    expect(isConfigured({ serverUrl: "", accessClientId: "", accessClientSecret: "" })).toBe(false);
    expect(isConfigured({ serverUrl: "https://x", accessClientId: "a", accessClientSecret: "" })).toBe(false);
    expect(isConfigured({ serverUrl: "https://x", accessClientId: "a", accessClientSecret: "b" })).toBe(true);
  });
});

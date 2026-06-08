import { describe, it, expect } from "vitest";
import { QR_PRESETS, DEFAULT_QR_PRESET, resolveQrPreset } from "@url-shortener/shared";

describe("QR presets", () => {
  it("every preset has a key, label, and non-empty color", () => {
    for (const p of QR_PRESETS) {
      expect(p.key).toBeTruthy();
      expect(p.label).toBeTruthy();
      expect(p.color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it("has unique keys", () => {
    expect(new Set(QR_PRESETS.map((p) => p.key)).size).toBe(QR_PRESETS.length);
  });

  it("resolves a known key", () => {
    expect(resolveQrPreset("navy").key).toBe("navy");
  });

  it("falls back to the first preset for unknown/undefined keys", () => {
    expect(resolveQrPreset("nope")).toBe(QR_PRESETS[0]);
    expect(resolveQrPreset(undefined)).toBe(QR_PRESETS[0]);
  });

  it("DEFAULT_QR_PRESET resolves to a real preset", () => {
    expect(resolveQrPreset(DEFAULT_QR_PRESET).key).toBe(DEFAULT_QR_PRESET);
  });
});

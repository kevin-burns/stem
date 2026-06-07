import { describe, it, expect } from "vitest";
import { generateSlug, isValidSlug, RESERVED_SLUGS, ALPHABET } from "@url-shortener/shared";

describe("ALPHABET", () => {
  it("excludes visually ambiguous characters", () => {
    for (const ch of "0O1lI") expect(ALPHABET).not.toContain(ch);
  });
});

describe("generateSlug", () => {
  it("returns a string of the requested length", () => {
    expect(generateSlug(7)).toHaveLength(7);
    expect(generateSlug(12)).toHaveLength(12);
  });
  it("only uses alphabet characters", () => {
    const s = generateSlug(50);
    for (const ch of s) expect(ALPHABET).toContain(ch);
  });
  it("is non-deterministic across calls", () => {
    const seen = new Set(Array.from({ length: 20 }, () => generateSlug(7)));
    expect(seen.size).toBeGreaterThan(1);
  });
});

describe("isValidSlug", () => {
  it("accepts allowed characters", () => {
    expect(isValidSlug("Abc_123-xyz")).toBe(true);
  });
  it("rejects empty, too-long, and illegal characters", () => {
    expect(isValidSlug("")).toBe(false);
    expect(isValidSlug("a".repeat(65))).toBe(false);
    expect(isValidSlug("has space")).toBe(false);
    expect(isValidSlug("slash/here")).toBe(false);
  });
  it("rejects reserved slugs", () => {
    for (const r of RESERVED_SLUGS) expect(isValidSlug(r)).toBe(false);
  });
});

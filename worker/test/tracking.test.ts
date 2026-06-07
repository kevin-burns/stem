import { describe, it, expect } from "vitest";
import { stripTracking } from "@url-shortener/shared";

describe("stripTracking", () => {
  it("removes the utm_* family", () => {
    const r = stripTracking("https://example.com/p?utm_source=x&utm_medium=y&utm_campaign=z");
    expect(r.url).toBe("https://example.com/p");
    expect(r.removed.sort()).toEqual(["utm_campaign", "utm_medium", "utm_source"]);
  });

  it("removes common click IDs (gclid, fbclid, msclkid, ttclid)", () => {
    const r = stripTracking("https://example.com/?gclid=1&fbclid=2&msclkid=3&ttclid=4");
    expect(r.url).toBe("https://example.com/");
    expect(r.removed.sort()).toEqual(["fbclid", "gclid", "msclkid", "ttclid"]);
  });

  it("preserves functional (non-tracking) params and their order", () => {
    const r = stripTracking("https://example.com/search?q=hello&utm_source=x&page=2");
    expect(r.url).toBe("https://example.com/search?q=hello&page=2");
    expect(r.removed).toEqual(["utm_source"]);
  });

  it("leaves a clean URL untouched and reports nothing removed", () => {
    const r = stripTracking("https://example.com/a/b?x=1");
    expect(r.url).toBe("https://example.com/a/b?x=1");
    expect(r.removed).toEqual([]);
  });

  it("is case-insensitive on parameter names", () => {
    const r = stripTracking("https://example.com/?UTM_Source=x&GCLID=y");
    expect(r.url).toBe("https://example.com/");
    expect(r.removed.sort()).toEqual(["GCLID", "UTM_Source"]);
  });

  it("does NOT strip the generic 'tag' param on non-Amazon hosts", () => {
    const r = stripTracking("https://stackoverflow.com/questions?tag=typescript");
    expect(r.url).toBe("https://stackoverflow.com/questions?tag=typescript");
    expect(r.removed).toEqual([]);
  });

  it("strips Amazon affiliate params on amazon.* hosts", () => {
    const r = stripTracking("https://www.amazon.com/dp/B0ABC?tag=aff-20&th=1&linkCode=ll1&pf_rd_r=ZZZ");
    expect(r.url).toBe("https://www.amazon.com/dp/B0ABC?th=1");
    expect(r.removed.sort()).toEqual(["linkCode", "pf_rd_r", "tag"]);
  });

  it("handles amazon regional TLDs (amazon.co.uk)", () => {
    const r = stripTracking("https://amazon.co.uk/dp/B0ABC?tag=aff-21");
    expect(r.url).toBe("https://amazon.co.uk/dp/B0ABC");
    expect(r.removed).toEqual(["tag"]);
  });

  it("does NOT treat amazon-spoofing hosts as Amazon", () => {
    const r = stripTracking("https://amazon.com.evil.example/p?tag=keepme");
    expect(r.url).toBe("https://amazon.com.evil.example/p?tag=keepme");
    expect(r.removed).toEqual([]);
  });

  it("returns the input unchanged when it cannot be parsed", () => {
    const r = stripTracking("not a url");
    expect(r.url).toBe("not a url");
    expect(r.removed).toEqual([]);
  });
});

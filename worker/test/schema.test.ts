import { describe, it, expect } from "vitest";
import { createLinkSchema, patchLinkSchema } from "@url-shortener/shared";

describe("createLinkSchema", () => {
  it("accepts a minimal valid body", () => {
    const r = createLinkSchema.safeParse({ url: "https://example.com" });
    expect(r.success).toBe(true);
  });
  it("accepts optional slug, expires_at, max_clicks", () => {
    const r = createLinkSchema.safeParse({
      url: "https://example.com",
      slug: "my-link",
      expires_at: 9999999999,
      max_clicks: 1,
    });
    expect(r.success).toBe(true);
  });
  it("rejects an invalid slug", () => {
    expect(createLinkSchema.safeParse({ url: "https://x.com", slug: "bad slug" }).success).toBe(false);
  });
  it("rejects max_clicks below 1", () => {
    expect(createLinkSchema.safeParse({ url: "https://x.com", max_clicks: 0 }).success).toBe(false);
  });
  it("rejects unknown fields", () => {
    expect(createLinkSchema.safeParse({ url: "https://x.com", evil: true }).success).toBe(false);
  });
  it("requires url", () => {
    expect(createLinkSchema.safeParse({}).success).toBe(false);
  });
});

describe("patchLinkSchema", () => {
  it("accepts partial updates", () => {
    expect(patchLinkSchema.safeParse({ disabled: true }).success).toBe(true);
    expect(patchLinkSchema.safeParse({ expires_at: null }).success).toBe(true);
  });
  it("rejects an empty object", () => {
    expect(patchLinkSchema.safeParse({}).success).toBe(false);
  });
});

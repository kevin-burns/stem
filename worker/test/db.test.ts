import { describe, it, expect, beforeEach } from "vitest";
import { env } from "cloudflare:test";
import { insertLink, getLink, listLinks, searchLinks, recordClick, patchLink, deleteLink } from "../src/lib/db.js";

beforeEach(async () => {
  await env.DB.exec("DELETE FROM links");
});

const base = { url: "https://example.com", created_at: 1000, expires_at: null, max_clicks: null };

describe("db helpers", () => {
  it("inserts and reads back a link", async () => {
    await insertLink(env.DB, { slug: "abc", ...base });
    const link = await getLink(env.DB, "abc");
    expect(link?.url).toBe("https://example.com");
    expect(link?.click_count).toBe(0);
    expect(link?.disabled).toBe(false);
  });

  it("returns null for a missing slug", async () => {
    expect(await getLink(env.DB, "nope")).toBeNull();
  });

  it("lists links newest first, capped by limit", async () => {
    await insertLink(env.DB, { slug: "old", ...base, created_at: 1 });
    await insertLink(env.DB, { slug: "new", ...base, created_at: 2 });
    const links = await listLinks(env.DB, 10);
    expect(links.map((l) => l.slug)).toEqual(["new", "old"]);
    expect(await listLinks(env.DB, 1)).toHaveLength(1);
  });

  it("searches by slug and destination URL, case-insensitive, newest first", async () => {
    await insertLink(env.DB, { slug: "gh", url: "https://github.com/foo", created_at: 2, expires_at: null, max_clicks: null });
    await insertLink(env.DB, { slug: "tw", url: "https://twitter.com/bar", created_at: 1, expires_at: null, max_clicks: null });
    expect((await searchLinks(env.DB, "github", 10)).map((l) => l.slug)).toEqual(["gh"]); // by url
    expect((await searchLinks(env.DB, "GH", 10)).map((l) => l.slug)).toEqual(["gh"]); // by slug, case-insensitive
    expect((await searchLinks(env.DB, "com", 10)).map((l) => l.slug)).toEqual(["gh", "tw"]); // both, newest first
    expect(await searchLinks(env.DB, "nomatch", 10)).toEqual([]);
  });

  it("treats LIKE wildcards in the query as literals", async () => {
    await insertLink(env.DB, { slug: "plain", url: "https://example.com/a", created_at: 1, expires_at: null, max_clicks: null });
    expect(await searchLinks(env.DB, "%", 10)).toEqual([]); // literal %, not a wildcard
  });

  it("records a click atomically", async () => {
    await insertLink(env.DB, { slug: "abc", ...base });
    await recordClick(env.DB, "abc", 1234);
    const link = await getLink(env.DB, "abc");
    expect(link?.click_count).toBe(1);
    expect(link?.last_clicked).toBe(1234);
  });

  it("patches fields and toggles disabled", async () => {
    await insertLink(env.DB, { slug: "abc", ...base });
    await patchLink(env.DB, "abc", { disabled: true, max_clicks: 5 });
    const link = await getLink(env.DB, "abc");
    expect(link?.disabled).toBe(true);
    expect(link?.max_clicks).toBe(5);
  });

  it("deletes a link", async () => {
    await insertLink(env.DB, { slug: "abc", ...base });
    await deleteLink(env.DB, "abc");
    expect(await getLink(env.DB, "abc")).toBeNull();
  });
});

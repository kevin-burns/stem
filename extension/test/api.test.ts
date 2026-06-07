import { describe, it, expect, vi, afterEach } from "vitest";
import { createLink, listLinks } from "../src/lib/api.js";
import type { Settings } from "../src/lib/settings.js";

const settings: Settings = {
  serverUrl: "https://l.example.com",
  accessClientId: "cid",
  accessClientSecret: "csec",
};

afterEach(() => vi.restoreAllMocks());

describe("createLink", () => {
  it("POSTs with Access service-token headers and returns the created link", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ slug: "abc", url: "https://x.com/", short_url: "https://l.example.com/abc", stripped: ["utm_source"] }), { status: 201 }),
    );
    const created = await createLink(settings, { url: "https://x.com?utm_source=y", slug: "abc" });
    expect(created.short_url).toBe("https://l.example.com/abc");
    expect(created.stripped).toEqual(["utm_source"]);
    const [url, init] = spy.mock.calls[0]!;
    expect(url).toBe("https://l.example.com/api/links");
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers["CF-Access-Client-Id"]).toBe("cid");
    expect(headers["CF-Access-Client-Secret"]).toBe("csec");
  });

  it("throws a helpful message on 409 (slug taken)", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "Slug already exists" }), { status: 409 }));
    await expect(createLink(settings, { url: "https://x.com", slug: "dup" })).rejects.toThrow(/taken|exists/i);
  });

  it("throws an access message on 403", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("Forbidden", { status: 403 }));
    await expect(createLink(settings, { url: "https://x.com" })).rejects.toThrow(/access|token/i);
  });

  it("surfaces the 422 reason", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ error: "Unsafe URL", reason: "private host" }), { status: 422 }));
    await expect(createLink(settings, { url: "http://127.0.0.1" })).rejects.toThrow(/private host/i);
  });

  it("reports an access rejection when Access returns a login redirect", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({ type: "opaqueredirect", ok: false, status: 0 } as Response);
    await expect(createLink(settings, { url: "https://x.com" })).rejects.toThrow(/access|redirect/i);
  });
});

describe("listLinks", () => {
  it("GETs recent links", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ links: [{ slug: "a" }] }), { status: 200 }));
    const links = await listLinks(settings);
    expect(links).toHaveLength(1);
  });

  it("passes the search query through ?q=", async () => {
    const spy = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({ links: [] }), { status: 200 }));
    await listLinks(settings, "term");
    expect(spy.mock.calls[0]![0]).toBe("https://l.example.com/api/links?q=term");
  });
});

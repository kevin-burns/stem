import { describe, it, expect } from "vitest";
import { checkStaticSafety, isPrivateOrInternalHost } from "@url-shortener/shared";

describe("checkStaticSafety", () => {
  it("accepts and normalizes a public https URL", () => {
    const r = checkStaticSafety("https://Example.com:443/Path?q=1");
    expect(r.ok).toBe(true);
    expect(r.normalized).toBe("https://example.com/Path?q=1");
  });
  it("rejects non-http(s) schemes", () => {
    for (const u of ["javascript:alert(1)", "data:text/html,x", "file:///etc/passwd", "ftp://x.com"]) {
      expect(checkStaticSafety(u).ok).toBe(false);
    }
  });
  it("rejects unparseable input", () => {
    expect(checkStaticSafety("not a url").ok).toBe(false);
  });
  it("rejects URLs longer than 2048 chars", () => {
    const long = "https://example.com/" + "a".repeat(2100);
    expect(checkStaticSafety(long).ok).toBe(false);
  });
  it("rejects private and internal hosts", () => {
    for (const u of [
      "http://localhost/x",
      "http://app.local/x",
      "http://127.0.0.1/x",
      "http://10.1.2.3/x",
      "http://192.168.0.1/x",
      "http://172.16.5.5/x",
      "http://169.254.169.254/latest/meta-data",
      "http://[::1]/x",
    ]) {
      expect(checkStaticSafety(u).ok).toBe(false);
    }
  });
});

describe("isPrivateOrInternalHost", () => {
  it("allows public hosts", () => {
    expect(isPrivateOrInternalHost("example.com")).toBe(false);
    expect(isPrivateOrInternalHost("8.8.8.8")).toBe(false);
  });
  it("rejects CGNAT and link-local IPv6", () => {
    expect(isPrivateOrInternalHost("100.64.0.1")).toBe(true);
    expect(isPrivateOrInternalHost("fe80::1")).toBe(true);
    expect(isPrivateOrInternalHost("fd00::1")).toBe(true);
  });
});

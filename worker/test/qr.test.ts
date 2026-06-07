import { describe, it, expect } from "vitest";
import { qrSvg } from "@url-shortener/shared";

describe("qrSvg", () => {
  it("returns a self-contained svg element", () => {
    const svg = qrSvg("https://l.example.com/abc");
    expect(svg.startsWith("<svg")).toBe(true);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(svg).toContain("viewBox=");
    expect(svg.endsWith("</svg>")).toBe(true);
  });

  it("is deterministic for the same input", () => {
    expect(qrSvg("https://l.example.com/x")).toBe(qrSvg("https://l.example.com/x"));
  });

  it("produces different output for different input", () => {
    expect(qrSvg("https://l.example.com/a")).not.toBe(qrSvg("https://l.example.com/b"));
  });

  it("always renders dark modules (finder patterns) over a light background", () => {
    const svg = qrSvg("hello");
    expect(svg).toContain('fill="#ffffff"');
    expect(svg).toContain('fill="#000000"');
    expect(svg).toMatch(/<path d="M/);
  });

  it("does not embed the source text in the markup", () => {
    expect(qrSvg("https://secret.example/zzz")).not.toContain("secret.example");
  });

  it("grows the viewBox by twice the margin", () => {
    const dim = (s: string) => Number(s.match(/viewBox="0 0 (\d+) /)![1]);
    expect(dim(qrSvg("hello", { margin: 4 })) - dim(qrSvg("hello", { margin: 0 }))).toBe(8);
  });

  it("throws on empty input", () => {
    expect(() => qrSvg("")).toThrow(/required/);
  });

  describe("framed / captioned", () => {
    it("renders a caption as <text> and grows taller than wide", () => {
      const svg = qrSvg("https://l.example.com/x", { caption: "SCAN ME" });
      expect(svg).toContain("<text");
      expect(svg).toContain("SCAN ME");
      const [, w, h] = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!;
      expect(Number(h)).toBeGreaterThan(Number(w));
    });

    it("draws a frame (stroke) when frame:true, with no caption text", () => {
      const svg = qrSvg("https://l.example.com/x", { frame: true });
      expect(svg).toContain("stroke=");
      expect(svg).not.toContain("<text");
    });

    it("XML-escapes the caption (no markup injection)", () => {
      const svg = qrSvg("https://l.example.com/x", { caption: '<b>&"' });
      expect(svg).not.toContain("<b>");
      expect(svg).toContain("&lt;b&gt;");
      expect(svg).toContain("&amp;");
    });

    it("a plain (unframed) code has neither a frame stroke nor a caption", () => {
      const svg = qrSvg("https://l.example.com/x");
      expect(svg).not.toContain("<text");
      expect(svg).not.toContain("stroke=");
    });
  });
});

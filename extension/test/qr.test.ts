import { describe, it, expect, beforeEach } from "vitest";
import { openQrOverlay } from "../src/popup/qr.js";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("openQrOverlay", () => {
  it("renders an SVG QR for the URL into the document", () => {
    openQrOverlay("https://l.example.com/abc");
    expect(document.querySelector("#qrOverlay svg")).not.toBeNull();
  });

  it("shows the short URL as a label", () => {
    openQrOverlay("https://l.example.com/abc");
    expect(document.querySelector(".qr-label")?.textContent).toBe("https://l.example.com/abc");
  });

  it("offers a Copy-image button", () => {
    openQrOverlay("https://l.example.com/abc");
    expect(document.querySelector("#qrOverlay .qr-copy")?.textContent).toBe("Copy image");
  });

  it("closes when the Close button is clicked", () => {
    openQrOverlay("https://l.example.com/abc");
    (document.querySelector("#qrOverlay .qr-close") as HTMLButtonElement).click();
    expect(document.getElementById("qrOverlay")).toBeNull();
  });

  it("never stacks — a second call replaces the first overlay", () => {
    openQrOverlay("https://l.example.com/a");
    openQrOverlay("https://l.example.com/b");
    expect(document.querySelectorAll("#qrOverlay").length).toBe(1);
  });

  it("renders the QR in the chosen preset color", () => {
    openQrOverlay("https://l.example.com/abc", { preset: "navy", caption: "SCAN ME" });
    expect(document.querySelector("#qrOverlay")!.innerHTML).toContain("#0a1f44");
  });

  it("falls back to black for an unknown preset", () => {
    openQrOverlay("https://l.example.com/abc", { preset: "bogus", caption: "SCAN ME" });
    expect(document.querySelector("#qrOverlay")!.innerHTML).toContain("#000000");
  });
});

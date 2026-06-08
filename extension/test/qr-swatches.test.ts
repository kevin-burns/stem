import { describe, it, expect, beforeEach } from "vitest";
import { QR_PRESETS } from "@url-shortener/shared";
import { buildSwatches } from "../src/options/qr-swatches.js";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("buildSwatches", () => {
  it("renders one accessible button per preset", () => {
    const btns = buildSwatches(document, "navy", () => {});
    expect(btns).toHaveLength(QR_PRESETS.length);
    for (const b of btns) {
      expect(b.tagName).toBe("BUTTON");
      expect(b.getAttribute("aria-label")).toBeTruthy();
    }
  });

  it("marks only the selected preset as pressed", () => {
    const btns = buildSwatches(document, "navy", () => {});
    const pressed = btns.filter((b) => b.getAttribute("aria-pressed") === "true");
    expect(pressed).toHaveLength(1);
    expect(pressed[0]!.dataset.preset).toBe("navy");
  });

  it("calls onPick with the preset key on click", () => {
    let picked = "";
    const btns = buildSwatches(document, "black", (k) => {
      picked = k;
    });
    btns.find((b) => b.dataset.preset === "forest")!.click();
    expect(picked).toBe("forest");
  });
});

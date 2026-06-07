import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const base = JSON.parse(readFileSync(path.join(dir, "../manifest.base.json"), "utf8"));

describe("manifest.base.json", () => {
  it("is MV3 with the expected entry points and least-privilege permissions", () => {
    expect(base.manifest_version).toBe(3);
    expect(base.action.default_popup).toBe("popup/popup.html");
    expect(base.options_ui.page).toBe("options/options.html");
    expect(base.permissions).toEqual(["storage", "activeTab", "clipboardWrite"]);
    expect(base.permissions).not.toContain("<all_urls>");
  });
});

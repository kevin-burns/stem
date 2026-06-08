import { QR_PRESETS } from "@url-shortener/shared";

// Build accessible swatch <button>s, one per preset. The selected key gets
// aria-pressed="true"; clicking a swatch calls onPick with its key.
export function buildSwatches(
  doc: Document,
  selectedKey: string,
  onPick: (key: string) => void,
): HTMLButtonElement[] {
  return QR_PRESETS.map((p) => {
    const b = doc.createElement("button");
    b.type = "button";
    b.className = "swatch";
    b.dataset.preset = p.key;
    b.title = p.label;
    b.setAttribute("aria-label", p.label);
    b.setAttribute("aria-pressed", String(p.key === selectedKey));
    b.style.background = p.color;
    b.onclick = () => onPick(p.key);
    return b;
  });
}

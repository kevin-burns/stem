// Foreground colors for QR codes. Background is always white — dark-on-white is the
// only reliably-scannable direction, so we vary the foreground only. Each color must
// pass a printed scan-test before shipping.
export interface QrPreset {
  key: string;
  label: string;
  color: string;
}

export const QR_PRESETS: QrPreset[] = [
  { key: "black", label: "Black", color: "#000000" },
  { key: "navy", label: "Navy", color: "#0a1f44" },
  { key: "indigo", label: "Indigo", color: "#3a3185" }, // darker than brand #4f46e5 for scan margin
  { key: "forest", label: "Forest", color: "#0f5132" },
  { key: "maroon", label: "Maroon", color: "#6a1b1a" },
];

export const DEFAULT_QR_PRESET = "black";

// Unknown or legacy keys fall back to the first preset — never an empty fill.
export function resolveQrPreset(key: string | undefined): QrPreset {
  return QR_PRESETS.find((p) => p.key === key) ?? QR_PRESETS[0]!;
}

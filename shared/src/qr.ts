import qrcode from "qrcode-generator";

export type QrEcc = "L" | "M" | "Q" | "H";

export interface QrSvgOptions {
  /** Quiet-zone width in modules around the symbol. Default 4 (per the QR spec). */
  margin?: number;
  /** Pixels per module, used for the SVG's intrinsic width/height. Default 4. */
  scale?: number;
  /** Error-correction level. Default "M". */
  ecc?: QrEcc;
  /** Dark-module colour. Default "#000000". */
  dark?: string;
  /** Background colour. Default "#ffffff". */
  light?: string;
}

/**
 * Render `text` as a self-contained QR-code SVG string. Pure and deterministic:
 * the same input always yields byte-identical output, with no DOM and no secrets,
 * so it is safe to call in the worker, the extension, or a test. `text` is encoded
 * into the QR matrix — it is never interpolated into the SVG markup.
 */
export function qrSvg(text: string, options: QrSvgOptions = {}): string {
  if (!text) throw new Error("qrSvg: text is required");
  const margin = options.margin ?? 4;
  const scale = options.scale ?? 4;
  const ecc = options.ecc ?? "M";
  const dark = options.dark ?? "#000000";
  const light = options.light ?? "#ffffff";

  const qr = qrcode(0, ecc); // typeNumber 0 = auto-fit the smallest symbol
  qr.addData(text);
  qr.make();

  const count = qr.getModuleCount();
  const dim = count + margin * 2;

  let path = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) {
        path += `M${col + margin} ${row + margin}h1v1h-1z`;
      }
    }
  }

  const px = dim * scale;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" ` +
    `viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">` +
    `<rect width="${dim}" height="${dim}" fill="${light}"/>` +
    `<path d="${path}" fill="${dark}"/></svg>`
  );
}

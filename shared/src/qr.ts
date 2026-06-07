import qrcode from "qrcode-generator";

export type QrEcc = "L" | "M" | "Q" | "H";

export interface QrSvgOptions {
  /** Quiet-zone width in modules around the symbol. Default 4 (per the QR spec). */
  margin?: number;
  /** Pixels per module, used for the SVG's intrinsic width/height. Default 4. */
  scale?: number;
  /** Error-correction level. Default "M". */
  ecc?: QrEcc;
  /** Dark-module / frame / caption colour. Default "#000000". */
  dark?: string;
  /** Background colour. Default "#ffffff". */
  light?: string;
  /** Draw a rounded frame around the code. Implied when `caption` is set. */
  frame?: boolean;
  /** Caption shown below the code (e.g. "SCAN ME"). Renders a framed layout. */
  caption?: string;
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case "&": return "&amp;";
      case "<": return "&lt;";
      case ">": return "&gt;";
      case '"': return "&quot;";
      default: return "&apos;";
    }
  });
}

/**
 * Render `text` as a self-contained QR-code SVG string. Pure and deterministic:
 * the same input always yields byte-identical output, with no DOM and no secrets,
 * so it is safe to call in the worker, the extension, or a test. `text` is encoded
 * into the QR matrix — it is never interpolated into the SVG markup.
 *
 * With `frame`/`caption`, it produces a "scan me" card: a rounded border around
 * the code and a caption underneath. The QR modules stay square for maximum
 * scannability; the caption is XML-escaped.
 */
export function qrSvg(text: string, options: QrSvgOptions = {}): string {
  if (!text) throw new Error("qrSvg: text is required");
  const margin = options.margin ?? 4;
  const scale = options.scale ?? 4;
  const ecc = options.ecc ?? "M";
  const dark = options.dark ?? "#000000";
  const light = options.light ?? "#ffffff";
  const caption = options.caption?.trim() ?? "";
  const framed = options.frame === true || caption.length > 0;

  const qr = qrcode(0, ecc); // typeNumber 0 = auto-fit the smallest symbol
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();

  // Dark-module path in local module coords (0..count); the caller translates it.
  let path = "";
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`;
    }
  }

  if (!framed) {
    const dim = count + margin * 2;
    const px = dim * scale;
    return (
      `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" ` +
      `viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">` +
      `<rect width="${dim}" height="${dim}" fill="${light}"/>` +
      `<g transform="translate(${margin} ${margin})"><path d="${path}" fill="${dark}"/></g></svg>`
    );
  }

  // Framed "scan me" card, laid out in module units (echoes Bitly's frame card).
  const inner = count + margin * 2; // white QR area side
  const FS = 1.5; // frame stroke width
  const FG = 1; // gap between stroke and the QR area
  const OM = 2; // outer background margin
  const B = OM + FS + FG; // edge → QR-area distance
  const W = inner + 2 * B;
  const capGap = caption ? 1.5 : 0;
  const capH = caption ? 6 : 0;
  const H = W + capGap + capH;

  const frameX = OM + FS / 2;
  const frameSide = W - 2 * OM - FS; // stroke centerline extent
  const qrOffset = B + margin; // top-left of the QR modules
  const fontSize = 4.5;
  const capBaseline = W + capGap + capH * 0.78;

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${(W * scale).toFixed(0)}" ` +
    `height="${(H * scale).toFixed(0)}" viewBox="0 0 ${W} ${H}">` +
    `<rect width="${W}" height="${H}" fill="${light}"/>` +
    `<rect x="${frameX}" y="${frameX}" width="${frameSide}" height="${frameSide}" rx="3" ` +
    `fill="${light}" stroke="${dark}" stroke-width="${FS}"/>` +
    `<g transform="translate(${qrOffset} ${qrOffset})" shape-rendering="crispEdges">` +
    `<path d="${path}" fill="${dark}"/></g>` +
    (caption
      ? `<text x="${W / 2}" y="${capBaseline}" text-anchor="middle" fill="${dark}" ` +
        `font-family="system-ui, -apple-system, Segoe UI, Roboto, sans-serif" ` +
        `font-size="${fontSize}" font-weight="700" letter-spacing="0.5">${escapeXml(caption)}</text>`
      : "") +
    `</svg>`
  );
}

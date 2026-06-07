import { qrSvg } from "@url-shortener/shared";

// Rasterise the QR SVG to a PNG blob. The SVG is loaded through a data: URL
// (canvas-clean — a blob/element source can taint the canvas in Chromium and
// break toBlob). Uses canvas, so it runs in the popup but not in jsdom.
async function qrPngBlob(svg: string, size: number): Promise<Blob> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("could not render the QR image"));
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  });
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);
  ctx.drawImage(img, 0, 0, size, size);
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!png) throw new Error("could not encode the PNG");
  return png;
}

// Put the QR PNG on the clipboard. NOT async on purpose: clipboard.write must be
// called synchronously inside the click gesture, so we hand ClipboardItem the
// blob Promise — awaiting it first would lose user activation (NotAllowedError).
export function copyQrImage(svg: string, size = 512): Promise<void> {
  return navigator.clipboard.write([new ClipboardItem({ "image/png": qrPngBlob(svg, size) })]);
}

// Show a modal overlay with the QR code for `shortUrl`, plus Copy-image and Close
// buttons. Appended to document.body; returns the overlay element (for testing).
// Replaces any existing overlay so repeated clicks never stack.
export function openQrOverlay(shortUrl: string, doc: Document = document): HTMLElement {
  doc.getElementById("qrOverlay")?.remove();

  const overlay = doc.createElement("div");
  overlay.id = "qrOverlay";
  overlay.className = "qr-overlay";

  const card = doc.createElement("div");
  card.className = "qr-card";

  const svg = qrSvg(shortUrl);
  const code = doc.createElement("div");
  code.className = "qr-code";
  // qrSvg output is trusted markup we generate ourselves — it encodes the URL as
  // geometry and never interpolates it into the SVG, so innerHTML is safe here.
  code.innerHTML = svg;

  const label = doc.createElement("p");
  label.className = "qr-label";
  label.textContent = shortUrl;

  const status = doc.createElement("p");
  status.className = "qr-status";
  status.setAttribute("role", "status");

  const actions = doc.createElement("div");
  actions.className = "qr-actions";

  const copy = doc.createElement("button");
  copy.className = "btn-copy qr-copy";
  copy.textContent = "Copy image";
  copy.onclick = () => {
    status.textContent = "Copying…";
    copyQrImage(svg).then(
      () => { status.textContent = "Copied to clipboard"; },
      (err: Error) => { status.textContent = `Copy failed — ${err.message}`; },
    );
  };

  const close = doc.createElement("button");
  close.className = "btn-primary qr-close";
  close.textContent = "Close";
  close.onclick = () => overlay.remove();

  actions.append(copy, close);
  card.append(code, label, status, actions);
  overlay.append(card);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  doc.body.append(overlay);
  return overlay;
}

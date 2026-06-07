import { qrSvg } from "@url-shortener/shared";

// Show a modal overlay with the QR code for `shortUrl`, plus a Close button.
// Appended to document.body; returns the overlay element (mainly for testing).
// Replaces any existing overlay so repeated clicks never stack.
export function openQrOverlay(shortUrl: string, doc: Document = document): HTMLElement {
  doc.getElementById("qrOverlay")?.remove();

  const overlay = doc.createElement("div");
  overlay.id = "qrOverlay";
  overlay.className = "qr-overlay";

  const card = doc.createElement("div");
  card.className = "qr-card";

  const code = doc.createElement("div");
  code.className = "qr-code";
  // qrSvg output is trusted markup we generate ourselves — it encodes the URL as
  // geometry and never interpolates it into the SVG, so innerHTML is safe here.
  code.innerHTML = qrSvg(shortUrl);

  const label = doc.createElement("p");
  label.className = "qr-label";
  label.textContent = shortUrl;

  const close = doc.createElement("button");
  close.className = "btn-primary w-full";
  close.textContent = "Close";
  close.onclick = () => overlay.remove();

  card.append(code, label, close);
  overlay.append(card);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) overlay.remove();
  });
  doc.body.append(overlay);
  return overlay;
}

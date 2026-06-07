import type { Hono } from "hono";
import type { Env } from "../env.js";

const PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Stem — Admin</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css" />
</head>
<body>
  <main class="container">
    <h1>Links</h1>
    <form id="create">
      <input name="url" type="url" placeholder="https://destination" required />
      <input name="slug" placeholder="custom slug (optional)" />
      <button type="submit">Shorten</button>
    </form>
    <p id="msg" role="status"></p>
    <input id="search" type="search" placeholder="Search by slug or URL…" />
    <table><thead><tr><th>Slug</th><th>URL</th><th>Clicks</th><th></th></tr></thead>
      <tbody id="rows"></tbody>
    </table>
    <dialog id="qrModal">
      <article style="text-align:center">
        <img id="qrImg" alt="QR code" style="display:block;margin:0 auto;width:240px;max-width:100%;height:auto" />
        <p id="qrMsg" style="min-height:1.2em;margin:.6rem 0;font-size:.85em;color:var(--pico-muted-color)"></p>
        <footer style="display:flex;gap:.5rem;justify-content:center">
          <button id="qrCopy" class="secondary" style="width:auto;margin:0;padding:.4rem .9rem">Copy image</button>
          <button id="qrClose" style="width:auto;margin:0;padding:.4rem .9rem">Close</button>
        </footer>
      </article>
    </dialog>
  </main>
  <script>
    const msg = document.getElementById("msg");
    const qrModal = document.getElementById("qrModal");
    const qrImg = document.getElementById("qrImg");
    qrModal.addEventListener("click", function (e) { if (e.target === qrModal) qrModal.close(); });
    document.getElementById("qrClose").onclick = function () { qrModal.close(); };
    var qrMsg = document.getElementById("qrMsg");
    // Rasterise the QR to a PNG and put it on the clipboard. Drawing the live SVG
    // <img> straight to a canvas can taint it in Chromium, so we fetch the SVG
    // markup and load it through a canvas-clean data: URL instead.
    async function qrPngBlob(width) {
      var svgText = await (await fetch(qrImg.src)).text();
      var img = new Image();
      await new Promise(function (res, rej) {
        img.onload = res;
        img.onerror = function () { rej(new Error("could not render the QR image")); };
        img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
      });
      // Preserve the SVG's aspect ratio — the framed card is taller than wide.
      var ratio = (img.naturalHeight || img.height) / (img.naturalWidth || img.width) || 1;
      var w = width, h = Math.round(width * ratio);
      var canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      var ctx = canvas.getContext("2d");
      ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, w, h);
      ctx.drawImage(img, 0, 0, w, h);
      return await new Promise(function (res, rej) {
        canvas.toBlob(function (b) { b ? res(b) : rej(new Error("could not encode the PNG")); }, "image/png");
      });
    }
    document.getElementById("qrCopy").onclick = function () {
      qrMsg.textContent = "Copying…";
      // Call clipboard.write synchronously within the click and hand ClipboardItem
      // a Promise<Blob> — awaiting the blob first would burn the user-activation
      // window and Chrome rejects the write with NotAllowedError.
      navigator.clipboard.write([new ClipboardItem({ "image/png": qrPngBlob(512) })]).then(
        function () { qrMsg.textContent = "Copied to clipboard"; },
        function (err) {
          console.error("QR copy failed:", err);
          qrMsg.textContent = "Copy failed — " + ((err && err.message) || err);
        }
      );
    };
    function escapeHtml(s) {
      return String(s).replace(/[&<>"']/g, function (c) {
        return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
      });
    }
    async function load() {
      const q = document.getElementById("search").value.trim();
      const r = await fetch("/api/links" + (q ? "?q=" + encodeURIComponent(q) : ""));
      const { links } = await r.json();
      document.getElementById("rows").innerHTML = links.map(function (l) {
        var slug = escapeHtml(l.slug);
        var url = escapeHtml(l.url);
        return "<tr><td><a href='/" + slug + "'>" + slug + "</a></td><td>" + url +
          "</td><td>" + l.click_count + "</td><td><button data-copy='" + slug +
          "' class='copy secondary'>Copy</button> <button data-qr='" + slug +
          "' class='qr secondary'>QR</button> <button data-slug='" + slug +
          "' class='del'>Delete</button></td></tr>";
      }).join("");
      document.querySelectorAll(".copy").forEach(function (b) {
        b.onclick = async function () {
          var link = location.origin + "/" + b.dataset.copy;
          try {
            await navigator.clipboard.writeText(link);
            msg.textContent = "Copied " + link;
          } catch (err) {
            msg.textContent = "Copy failed — " + link;
          }
        };
      });
      document.querySelectorAll(".del").forEach(function (b) {
        b.onclick = async function () {
          await fetch("/api/links/" + b.dataset.slug, { method: "DELETE" });
          load();
        };
      });
      document.querySelectorAll(".qr").forEach(function (b) {
        b.onclick = function () {
          qrMsg.textContent = ""; // clear any stale "Copied" status from a prior link
          qrImg.src = "/api/links/" + encodeURIComponent(b.dataset.qr) + "/qr?frame=1";
          qrModal.showModal();
        };
      });
    }
    document.getElementById("create").onsubmit = async function (e) {
      e.preventDefault();
      const f = new FormData(e.target);
      const body = { url: f.get("url") };
      if (f.get("slug")) body.slug = f.get("slug");
      const r = await fetch("/api/links", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await r.json();
      if (r.ok) {
        var note = "Created " + data.short_url;
        if (data.stripped && data.stripped.length) {
          note += " — stripped " + data.stripped.length + " tracker" +
            (data.stripped.length === 1 ? "" : "s") + " (" + data.stripped.join(", ") + ")";
        }
        msg.textContent = note;
        e.target.reset();
        load();
      } else {
        msg.textContent = "Error: " + (data.reason || data.error);
      }
    };
    var searchTimer;
    document.getElementById("search").oninput = function () {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(load, 200);
    };
    load();
  </script>
</body>
</html>`;

export function registerAdmin(app: Hono<{ Bindings: Env }>): void {
  app.get("/admin", (c) => c.html(PAGE));
}

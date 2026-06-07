import type { Hono } from "hono";
import type { Env } from "../env.js";

const PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Link Shortener — Admin</title>
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
  </main>
  <script>
    const msg = document.getElementById("msg");
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
          "' class='copy secondary'>Copy</button> <button data-slug='" + slug +
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

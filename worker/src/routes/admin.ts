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
    <table><thead><tr><th>Slug</th><th>URL</th><th>Clicks</th><th></th></tr></thead>
      <tbody id="rows"></tbody>
    </table>
  </main>
  <script>
    const msg = document.getElementById("msg");
    async function load() {
      const r = await fetch("/api/links");
      const { links } = await r.json();
      document.getElementById("rows").innerHTML = links.map(function (l) {
        return "<tr><td><a href='/" + l.slug + "'>" + l.slug + "</a></td><td>" + l.url +
          "</td><td>" + l.click_count + "</td><td><button data-slug='" + l.slug +
          "' class='del'>Delete</button></td></tr>";
      }).join("");
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
      msg.textContent = r.ok ? "Created " + data.short_url : "Error: " + (data.reason || data.error);
      if (r.ok) { e.target.reset(); load(); }
    };
    load();
  </script>
</body>
</html>`;

export function registerAdmin(app: Hono<{ Bindings: Env }>): void {
  app.get("/admin", (c) => c.html(PAGE));
}

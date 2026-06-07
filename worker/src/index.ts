import { Hono } from "hono";
import type { Env } from "./env.js";
import { requireAuth } from "./middleware/auth.js";
import { registerApi } from "./routes/api.js";
import { registerAdmin } from "./routes/admin.js";
import { registerRedirect } from "./routes/redirect.js";

const app = new Hono<{ Bindings: Env }>();

app.get("/healthz", (c) => c.text("ok"));

// Protected surfaces (defense-in-depth behind Cloudflare Access at the edge).
app.use("/admin", requireAuth);
registerAdmin(app);
registerApi(app); // applies its own /api/* auth middleware

// Public redirect — registered last so /:slug never shadows known routes.
registerRedirect(app);

// Generic 404 so the public surface reveals nothing about which slugs exist.
app.notFound((c) => c.text("Not found", 404));

// Top-level guard: an unexpected throw becomes a logged 500, never a crash.
app.onError((err, c) => {
  console.error("unhandled", { path: c.req.path, name: err.name });
  return c.text("Internal error", 500);
});

export default app;

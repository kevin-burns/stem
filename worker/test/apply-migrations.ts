import { applyD1Migrations, env } from "cloudflare:test";

// Runs once before the suite; applies real migrations to the test D1.
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

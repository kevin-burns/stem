import { defineWorkersConfig, readD1Migrations } from "@cloudflare/vitest-pool-workers/config";
import path from "node:path";

export default defineWorkersConfig(async () => {
  const migrations = await readD1Migrations(path.join(__dirname, "migrations"));
  return {
    test: {
      setupFiles: ["./test/apply-migrations.ts"],
      poolOptions: {
        workers: {
          singleWorker: true,
          isolatedStorage: true,
          miniflare: {
            compatibilityFlags: ["nodejs_compat"],
            d1Databases: { DB: "test-db" },
            bindings: {
              TEST_MIGRATIONS: migrations,
              API_TOKEN: "test-token",
              REPUTATION_PROVIDER: "none",
              SHORT_DOMAIN: "l.example.com",
            },
          },
          wrangler: { configPath: "./wrangler.toml" },
        },
      },
    },
  };
});

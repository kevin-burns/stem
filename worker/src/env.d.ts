import type { D1Database } from "@cloudflare/workers-types";
import type { D1Migration } from "cloudflare:test";

// Worker bindings live on the global `Cloudflare.Env` (wrangler 4 idiom). The
// vitest-pool-workers `env` is typed as `Cloudflare.Env`, so test-only bindings
// (TEST_MIGRATIONS) are declared here too; production code never reads them.
declare global {
  namespace Cloudflare {
    interface Env {
      DB: D1Database;
      API_TOKEN: string;
      REPUTATION_PROVIDER: "google-safe-browsing" | "cloudflare-intel" | "cloudflare-urlscan" | "none";
      SHORT_DOMAIN: string;
      SAFE_BROWSING_API_KEY?: string;
      CF_INTEL_TOKEN?: string;
      CF_ACCOUNT_ID?: string;
      ACCESS_TEAM_DOMAIN?: string;
      ACCESS_AUD?: string;
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

export type Env = Cloudflare.Env;

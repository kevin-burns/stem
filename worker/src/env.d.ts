import type { D1Database } from "@cloudflare/workers-types";

export interface Env {
  DB: D1Database;
  API_TOKEN: string;
  REPUTATION_PROVIDER: "google-safe-browsing" | "cloudflare-intel" | "cloudflare-urlscan" | "none";
  SHORT_DOMAIN: string;
  SAFE_BROWSING_API_KEY?: string;
  CF_INTEL_TOKEN?: string;
  CF_ACCOUNT_ID?: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
}

declare module "cloudflare:test" {
  interface ProvidedEnv extends Env {
    TEST_MIGRATIONS: D1Migration[];
  }
}

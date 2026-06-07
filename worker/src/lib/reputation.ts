import type { Env } from "../env.js";

export interface ReputationResult {
  ok: boolean;
  reason?: string;
}

const OK: ReputationResult = { ok: true };

export async function reputationCheck(url: string, env: Env): Promise<ReputationResult> {
  const provider = env.REPUTATION_PROVIDER ?? "google-safe-browsing";
  try {
    switch (provider) {
      case "google-safe-browsing":
        return env.SAFE_BROWSING_API_KEY ? await safeBrowsing(url, env.SAFE_BROWSING_API_KEY) : OK;
      case "cloudflare-intel":
        return env.CF_INTEL_TOKEN && env.CF_ACCOUNT_ID
          ? await cloudflareIntel(url, env.CF_INTEL_TOKEN, env.CF_ACCOUNT_ID)
          : OK;
      case "cloudflare-urlscan":
        // URL Scanner is an async deep scan; reserved for a future background job,
        // not the inline create gate. Treat as a no-op here.
        console.warn("cloudflare-urlscan is background-only; skipping inline check");
        return OK;
      case "none":
      default:
        return OK;
    }
  } catch (err) {
    // Fail open: a provider outage must not block link creation.
    // Log only the error class — never the raw error, which can embed the destination URL.
    console.error("reputationCheck failed", { name: (err as Error)?.name });
    return OK;
  }
}

async function safeBrowsing(url: string, apiKey: string): Promise<ReputationResult> {
  const res = await fetch(
    `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client: { clientId: "url-shortener", clientVersion: "0.1.0" },
        threatInfo: {
          threatTypes: ["MALWARE", "SOCIAL_ENGINEERING", "UNWANTED_SOFTWARE", "POTENTIALLY_HARMFUL_APPLICATION"],
          platformTypes: ["ANY_PLATFORM"],
          threatEntryTypes: ["URL"],
          threatEntries: [{ url }],
        },
      }),
    },
  );
  if (!res.ok) return OK; // fail open
  const data = (await res.json()) as { matches?: { threatType?: string }[] };
  if (data.matches && data.matches.length > 0) {
    const type = data.matches[0]?.threatType ?? "THREAT";
    return { ok: false, reason: `Destination flagged by Safe Browsing (${type})` };
  }
  return OK;
}

async function cloudflareIntel(url: string, token: string, accountId: string): Promise<ReputationResult> {
  const domain = new URL(url).hostname;
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/intel/domain?domain=${encodeURIComponent(domain)}`,
    { headers: { authorization: `Bearer ${token}` } },
  );
  if (!res.ok) return OK; // fail open
  const data = (await res.json()) as { result?: { security_categories?: { name?: string }[] } };
  const cats = data.result?.security_categories ?? [];
  if (cats.length > 0) {
    return { ok: false, reason: `Domain flagged by Cloudflare Intel (${cats[0]?.name ?? "security risk"})` };
  }
  return OK;
}

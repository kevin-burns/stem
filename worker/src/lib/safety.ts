import { checkStaticSafety, type SafetyResult } from "@url-shortener/shared";
import type { Env } from "../env.js";
import { reputationCheck } from "./reputation.js";

export async function checkUrlSafety(raw: string, env: Env): Promise<SafetyResult> {
  const stat = checkStaticSafety(raw);
  if (!stat.ok || !stat.normalized) return stat;

  // Reject links that point back at our own short domain (loop prevention).
  if (new URL(stat.normalized).hostname.toLowerCase() === env.SHORT_DOMAIN.toLowerCase()) {
    return { ok: false, reason: "Destination points at the shortener itself" };
  }

  const rep = await reputationCheck(stat.normalized, env);
  if (!rep.ok) return { ok: false, reason: rep.reason };

  return { ok: true, normalized: stat.normalized };
}

// Tracking / affiliate query-parameter stripping (logic only).
// The parameter lists live in ./tracking-data.ts so they can be refreshed
// independently (see `npm run update:tracking`).

import {
  GLOBAL_TRACKING_PARAMS,
  GLOBAL_TRACKING_PREFIXES,
  AMAZON_PARAMS,
  AMAZON_PREFIXES,
} from "./tracking-data.js";

const globalParams = new Set(GLOBAL_TRACKING_PARAMS.map((p) => p.toLowerCase()));
const amazonParams = new Set(AMAZON_PARAMS.map((p) => p.toLowerCase()));

function isGlobalTrackingKey(lowerKey: string): boolean {
  if (globalParams.has(lowerKey)) return true;
  return GLOBAL_TRACKING_PREFIXES.some((prefix) => lowerKey.startsWith(prefix));
}

function isAmazonHost(hostname: string): boolean {
  return /(^|\.)amazon\.[a-z.]+$/i.test(hostname);
}

function isAmazonAffiliateKey(lowerKey: string): boolean {
  if (amazonParams.has(lowerKey)) return true;
  return AMAZON_PREFIXES.some((prefix) => lowerKey.startsWith(prefix));
}

export interface StripResult {
  url: string;
  removed: string[];
}

/**
 * Remove known tracking and affiliate query parameters from a URL.
 * Returns the cleaned URL and the original-cased names of the params removed.
 * Unparseable input is returned unchanged.
 */
export function stripTracking(rawUrl: string): StripResult {
  let u: URL;
  try {
    u = new URL(rawUrl);
  } catch {
    return { url: rawUrl, removed: [] };
  }

  const amazon = isAmazonHost(u.hostname);
  const removed: string[] = [];

  for (const key of [...u.searchParams.keys()]) {
    const lower = key.toLowerCase();
    if (isGlobalTrackingKey(lower) || (amazon && isAmazonAffiliateKey(lower))) {
      if (!removed.includes(key)) removed.push(key);
      u.searchParams.delete(key);
    }
  }

  return { url: u.toString(), removed };
}

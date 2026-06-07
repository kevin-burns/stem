export interface SafetyResult {
  ok: boolean;
  reason?: string;
  normalized?: string;
  /** Tracking/affiliate params removed from the destination, if any. */
  removed?: string[];
}

const ALLOWED_SCHEMES = new Set(["http:", "https:"]);
const MAX_URL_LENGTH = 2048;

function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const o = m.slice(1).map(Number);
  if (o.some((n) => n > 255)) return false;
  const [a, b] = o as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return false;
}

function isPrivateIPv6(host: string): boolean {
  if (!host.includes(":")) return false;
  if (host === "::1" || host === "::") return true;
  const first = host.split(":")[0] ?? "";
  if (/^f[cd][0-9a-f]{0,2}$/.test(first)) return true; // fc00::/7 ULA
  if (/^fe[89ab][0-9a-f]?$/.test(first)) return true; // fe80::/10 link-local
  return false;
}

export function isPrivateOrInternalHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost") || h.endsWith(".local")) return true;
  if (isPrivateIPv4(h)) return true;
  if (isPrivateIPv6(h)) return true;
  return false;
}

export function checkStaticSafety(raw: string): SafetyResult {
  if (raw.length > MAX_URL_LENGTH) return { ok: false, reason: "URL exceeds 2048 characters" };
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, reason: "Not a valid absolute URL" };
  }
  if (!ALLOWED_SCHEMES.has(u.protocol)) {
    return { ok: false, reason: `Scheme "${u.protocol}" is not allowed` };
  }
  if (isPrivateOrInternalHost(u.hostname)) {
    return { ok: false, reason: "Destination is a private or internal host" };
  }
  u.hostname = u.hostname.toLowerCase();
  return { ok: true, normalized: u.toString() };
}

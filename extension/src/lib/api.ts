import type { Link } from "@url-shortener/shared";
import type { Settings } from "./settings.js";

export interface CreateInput {
  url: string;
  slug?: string;
  expires_at?: number | null;
  max_clicks?: number | null;
}

export interface CreatedLink {
  slug: string;
  url: string;
  short_url: string;
  stripped: string[];
}

function authHeaders(s: Settings): Record<string, string> {
  return {
    "content-type": "application/json",
    "CF-Access-Client-Id": s.accessClientId,
    "CF-Access-Client-Secret": s.accessClientSecret,
  };
}

function base(s: Settings): string {
  return s.serverUrl.replace(/\/+$/, "");
}

async function errorFor(res: Response): Promise<Error> {
  if (res.status === 401 || res.status === 403) {
    return new Error("Access rejected — check your service token and Access policy.");
  }
  let reason = "";
  try {
    const body = (await res.json()) as { reason?: string; error?: string };
    reason = body.reason || body.error || "";
  } catch {
    /* non-JSON body */
  }
  if (res.status === 409) return new Error(reason || "That slug is already taken.");
  if (res.status === 422) return new Error(reason || "That URL was rejected.");
  return new Error(reason || `Request failed (${res.status}).`);
}

async function request(url: string, init: RequestInit): Promise<Response> {
  // redirect: "manual" so a Cloudflare Access login redirect surfaces as a clear
  // message instead of an opaque "Failed to fetch" when the service token is rejected.
  const res = await fetch(url, { ...init, redirect: "manual" });
  if (res.type === "opaqueredirect") {
    throw new Error("Access rejected — got a login redirect. Check the Service Auth policy on your Access app.");
  }
  if (!res.ok) throw await errorFor(res);
  return res;
}

export async function createLink(s: Settings, input: CreateInput): Promise<CreatedLink> {
  const res = await request(`${base(s)}/api/links`, {
    method: "POST",
    headers: authHeaders(s),
    body: JSON.stringify(input),
  });
  return (await res.json()) as CreatedLink;
}

export async function listLinks(s: Settings, q?: string, limit?: number): Promise<Link[]> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (limit) params.set("limit", String(limit));
  const qs = params.toString();
  const url = `${base(s)}/api/links` + (qs ? `?${qs}` : "");
  const res = await request(url, { headers: authHeaders(s) });
  const body = (await res.json()) as { links: Link[] };
  return body.links;
}

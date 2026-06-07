import type { MiddlewareHandler } from "hono";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Env } from "../env.js";

// Constant-time string comparison to avoid leaking token length/contents via timing.
function timingSafeEqual(a: string, b: string): boolean {
  const enc = new TextEncoder();
  const ab = enc.encode(a);
  const bb = enc.encode(b);
  if (ab.length !== bb.length) return false;
  let diff = 0;
  for (let i = 0; i < ab.length; i++) diff |= ab[i]! ^ bb[i]!;
  return diff === 0;
}

const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

async function verifyAccessJwt(jwt: string, env: Env): Promise<boolean> {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD) return false;
  const certsUrl = `https://${env.ACCESS_TEAM_DOMAIN}/cdn-cgi/access/certs`;
  let jwks = jwksCache.get(certsUrl);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(certsUrl));
    jwksCache.set(certsUrl, jwks);
  }
  try {
    await jwtVerify(jwt, jwks, {
      issuer: `https://${env.ACCESS_TEAM_DOMAIN}`,
      audience: env.ACCESS_AUD,
    });
    return true;
  } catch {
    return false;
  }
}

export const requireAuth: MiddlewareHandler<{ Bindings: Env }> = async (c, next) => {
  const header = c.req.header("Authorization");
  if (header?.startsWith("Bearer ")) {
    const token = header.slice(7);
    if (token.length > 0 && c.env.API_TOKEN && timingSafeEqual(token, c.env.API_TOKEN)) {
      return next();
    }
  }
  const accessJwt = c.req.header("Cf-Access-Jwt-Assertion");
  if (accessJwt && (await verifyAccessJwt(accessJwt, c.env))) return next();
  return c.json({ error: "Unauthorized" }, 401);
};

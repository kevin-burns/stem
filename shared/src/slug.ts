// Unambiguous base-57 alphabet: excludes 0, O, 1, l, I.
export const ALPHABET =
  "23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "admin",
  "api",
  "assets",
  "favicon.ico",
  "robots.txt",
]);

const SLUG_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

export function isValidSlug(slug: string): boolean {
  if (!SLUG_PATTERN.test(slug)) return false;
  if (RESERVED_SLUGS.has(slug.toLowerCase())) return false;
  return true;
}

// Rejection sampling avoids modulo bias across the alphabet.
export function generateSlug(length = 7): string {
  const max = 256 - (256 % ALPHABET.length);
  let out = "";
  while (out.length < length) {
    const bytes = new Uint8Array(length - out.length);
    crypto.getRandomValues(bytes);
    for (const b of bytes) {
      if (b < max) out += ALPHABET[b % ALPHABET.length];
    }
  }
  return out;
}

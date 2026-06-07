import type { D1Database } from "@cloudflare/workers-types";
import type { Link, PatchLinkInput } from "@url-shortener/shared";

interface LinkRow {
  slug: string;
  url: string;
  created_at: number;
  expires_at: number | null;
  max_clicks: number | null;
  click_count: number;
  last_clicked: number | null;
  disabled: number;
}

function rowToLink(r: LinkRow): Link {
  return { ...r, disabled: r.disabled === 1 };
}

export interface NewLink {
  slug: string;
  url: string;
  created_at: number;
  expires_at: number | null;
  max_clicks: number | null;
}

export async function insertLink(db: D1Database, link: NewLink): Promise<void> {
  await db
    .prepare(
      `INSERT INTO links (slug, url, created_at, expires_at, max_clicks, click_count, last_clicked, disabled)
       VALUES (?, ?, ?, ?, ?, 0, NULL, 0)`,
    )
    .bind(link.slug, link.url, link.created_at, link.expires_at, link.max_clicks)
    .run();
}

export async function getLink(db: D1Database, slug: string): Promise<Link | null> {
  const row = await db.prepare("SELECT * FROM links WHERE slug = ?").bind(slug).first<LinkRow>();
  return row ? rowToLink(row) : null;
}

export async function listLinks(db: D1Database, limit: number): Promise<Link[]> {
  const { results } = await db
    .prepare("SELECT * FROM links ORDER BY created_at DESC LIMIT ?")
    .bind(limit)
    .all<LinkRow>();
  return results.map(rowToLink);
}

// Case-insensitive substring search over slug and destination URL. The query is
// escaped so a literal % or _ from the user is not treated as a LIKE wildcard.
export async function searchLinks(db: D1Database, query: string, limit: number): Promise<Link[]> {
  const like = `%${query.replace(/[\\%_]/g, (c) => "\\" + c)}%`;
  const { results } = await db
    .prepare(
      "SELECT * FROM links WHERE slug LIKE ?1 ESCAPE '\\' OR url LIKE ?1 ESCAPE '\\' ORDER BY created_at DESC LIMIT ?2",
    )
    .bind(like, limit)
    .all<LinkRow>();
  return results.map(rowToLink);
}

export async function recordClick(db: D1Database, slug: string, at: number): Promise<void> {
  await db
    .prepare("UPDATE links SET click_count = click_count + 1, last_clicked = ? WHERE slug = ?")
    .bind(at, slug)
    .run();
}

export async function patchLink(db: D1Database, slug: string, patch: PatchLinkInput): Promise<void> {
  const sets: string[] = [];
  const values: (string | number | null)[] = [];
  if ("expires_at" in patch) {
    sets.push("expires_at = ?");
    values.push(patch.expires_at ?? null);
  }
  if ("max_clicks" in patch) {
    sets.push("max_clicks = ?");
    values.push(patch.max_clicks ?? null);
  }
  if ("disabled" in patch) {
    sets.push("disabled = ?");
    values.push(patch.disabled ? 1 : 0);
  }
  if (sets.length === 0) return;
  values.push(slug);
  await db.prepare(`UPDATE links SET ${sets.join(", ")} WHERE slug = ?`).bind(...values).run();
}

export async function deleteLink(db: D1Database, slug: string): Promise<void> {
  await db.prepare("DELETE FROM links WHERE slug = ?").bind(slug).run();
}

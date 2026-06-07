#!/usr/bin/env node
// Regenerate the GLOBAL tracking-param list in shared/src/tracking-data.ts from
// the actively-maintained AdGuard "URL Tracking" filter.
//
//   node scripts/update-tracking-params.mjs   (or: npm run update:tracking)
//
// Only AdGuard's *global* plain `$removeparam=<name>` rules are imported (the
// ones AdGuard vets as safe to apply on every site). Domain-specific and regex
// rules are intentionally skipped; `utm_*` is handled by a prefix in the logic,
// and the Amazon section in tracking-data.ts is hand-maintained.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const FILTER_URL = "https://filters.adtidy.org/extension/ublock/filters/17.txt";
// Real trackers AdGuard's *global* section omits (it covers them via regex/domain
// rules, which we don't import). Kept here so coverage doesn't regress.
const MUST_INCLUDE = ["igshid", "igsh", "li_fat_id"];

const dirname = path.dirname(fileURLToPath(import.meta.url));
const dataFile = path.join(dirname, "..", "shared", "src", "tracking-data.ts");

const res = await fetch(FILTER_URL);
if (!res.ok) throw new Error(`Failed to fetch AdGuard filter: ${res.status}`);
const text = await res.text();
const version = (text.match(/^! Version:\s*(.+)$/m) ?? [])[1] ?? "unknown";

const params = new Set(MUST_INCLUDE.map((p) => p.toLowerCase()));
for (const line of text.split(/\r?\n/)) {
  const m = line.trim().match(/^\$removeparam=([A-Za-z0-9_-]+)$/);
  if (m) params.add(m[1].toLowerCase());
}
const sorted = [...params].sort();

const block =
  "// === GLOBAL:START (auto-generated — do not edit by hand) ===\n" +
  `// Source: AdGuard URL Tracking filter v${version} + MUST_INCLUDE platform IDs.\n` +
  "// Regenerate with: npm run update:tracking\n" +
  "export const GLOBAL_TRACKING_PARAMS: readonly string[] = [\n" +
  sorted.map((p) => `  ${JSON.stringify(p)},`).join("\n") +
  "\n];\n" +
  "// === GLOBAL:END ===";

const current = await readFile(dataFile, "utf8");
const updated = current.replace(
  /\/\/ === GLOBAL:START[\s\S]*?\/\/ === GLOBAL:END ===/,
  block,
);
if (updated === current) {
  throw new Error("Could not find GLOBAL:START/END markers in tracking-data.ts");
}
await writeFile(dataFile, updated);
console.log(`Wrote ${sorted.length} global tracking params (AdGuard v${version}).`);

// Client-side pagination for the recent-links list. Pure helpers + an
// accessible Prev/Next control. Pages a single in-memory batch — no server
// offset/cursor (single-user scale; search reaches anything past the batch).

export function pageCount(total: number, perPage: number): number {
  return Math.max(1, Math.ceil(total / perPage));
}

// Keep a (0-based) page index within [0, lastPage].
export function clampPage(page: number, total: number, perPage: number): number {
  return Math.min(Math.max(page, 0), pageCount(total, perPage) - 1);
}

export function pageSlice<T>(items: T[], page: number, perPage: number): T[] {
  const p = clampPage(page, items.length, perPage);
  return items.slice(p * perPage, p * perPage + perPage);
}

export interface PagerOptions {
  page: number; // 0-based
  total: number;
  perPage: number;
  onPage: (page: number) => void;
}

// Returns a Prev / "Page X of Y" / Next control, or null when there's only one
// page (nothing to flip through).
export function buildPager(doc: Document, opts: PagerOptions): HTMLElement | null {
  const pages = pageCount(opts.total, opts.perPage);
  if (pages <= 1) return null;
  const page = clampPage(opts.page, opts.total, opts.perPage);

  const wrap = doc.createElement("div");
  wrap.className = "flex items-center justify-between pt-2";

  const prev = doc.createElement("button");
  prev.type = "button";
  prev.className = "btn-copy";
  prev.textContent = "Prev";
  prev.disabled = page === 0;
  prev.onclick = () => opts.onPage(page - 1);

  const label = doc.createElement("span");
  label.className = "text-xs text-gray-500";
  label.textContent = `Page ${page + 1} of ${pages}`;

  const next = doc.createElement("button");
  next.type = "button";
  next.className = "btn-copy";
  next.textContent = "Next";
  next.disabled = page >= pages - 1;
  next.onclick = () => opts.onPage(page + 1);

  wrap.append(prev, label, next);
  return wrap;
}

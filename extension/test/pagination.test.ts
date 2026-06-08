import { describe, it, expect, beforeEach } from "vitest";
import { pageCount, clampPage, pageSlice, buildPager } from "../src/popup/pagination.js";

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("pageCount", () => {
  it("is at least 1, even for an empty list", () => {
    expect(pageCount(0, 10)).toBe(1);
  });
  it("rounds up partial pages", () => {
    expect(pageCount(10, 10)).toBe(1);
    expect(pageCount(11, 10)).toBe(2);
    expect(pageCount(25, 10)).toBe(3);
  });
});

describe("clampPage", () => {
  it("keeps the page within range", () => {
    expect(clampPage(-1, 25, 10)).toBe(0);
    expect(clampPage(99, 25, 10)).toBe(2); // last page is index 2
  });
});

describe("pageSlice", () => {
  const items = Array.from({ length: 25 }, (_, i) => i);
  it("returns the right window per page", () => {
    expect(pageSlice(items, 0, 10)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(pageSlice(items, 2, 10)).toEqual([20, 21, 22, 23, 24]);
  });
  it("clamps an out-of-range page to the last one", () => {
    expect(pageSlice(items, 99, 10)).toEqual([20, 21, 22, 23, 24]);
  });
});

describe("buildPager", () => {
  it("returns null when there is only one page", () => {
    expect(buildPager(document, { page: 0, total: 8, perPage: 10, onPage: () => {} })).toBeNull();
  });

  it("renders Prev/Next with a page label", () => {
    const pager = buildPager(document, { page: 1, total: 25, perPage: 10, onPage: () => {} })!;
    expect(pager).not.toBeNull();
    expect(pager.textContent).toContain("Page 2 of 3");
    const [prev, next] = pager.querySelectorAll("button");
    expect((prev as HTMLButtonElement).disabled).toBe(false);
    expect((next as HTMLButtonElement).disabled).toBe(false);
  });

  it("disables Prev on the first page and Next on the last", () => {
    const first = buildPager(document, { page: 0, total: 25, perPage: 10, onPage: () => {} })!;
    expect((first.querySelector("button") as HTMLButtonElement).disabled).toBe(true);

    const last = buildPager(document, { page: 2, total: 25, perPage: 10, onPage: () => {} })!;
    const nextOnLast = last.querySelectorAll("button")[1] as HTMLButtonElement;
    expect(nextOnLast.disabled).toBe(true);
  });

  it("calls onPage with the target page when clicked", () => {
    let target = -1;
    const pager = buildPager(document, { page: 1, total: 25, perPage: 10, onPage: (p) => { target = p; } })!;
    const buttons = pager.querySelectorAll("button");
    (buttons[0] as HTMLButtonElement).click(); // Prev → 0
    expect(target).toBe(0);
    (buttons[1] as HTMLButtonElement).click(); // Next → 2
    expect(target).toBe(2);
  });
});

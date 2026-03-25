export const DEFAULT_PER_PAGE = 10;
export const ALLOWED_PER_PAGE = [10, 50, 100] as const;
export type AllowedPerPage = typeof ALLOWED_PER_PAGE[number];

export function isAllowedPerPage(value: number): value is AllowedPerPage {
  return (ALLOWED_PER_PAGE as readonly number[]).includes(value);
}

export function parsePerPage(raw: string | null | undefined): AllowedPerPage | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return isAllowedPerPage(value) ? value : null;
}

export function parsePage(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return Math.trunc(value);
}

export function totalPagesFor(totalPosts: number, perPage: number): number {
  if (totalPosts <= 0) return 1;
  return Math.max(1, Math.ceil(totalPosts / perPage));
}

export function normalizePage(page: number, totalPages: number): number {
  if (!Number.isFinite(page)) return 1;
  if (page < 1) return 1;
  if (page > totalPages) return totalPages;
  return page;
}

export function offsetFor(page: number, perPage: number): number {
  return (page - 1) * perPage;
}

export function buildPageHref(baseUrl: string, page: number, perPage: number): string {
  const url = new URL(baseUrl, "https://blog.codewithbotina.com");
  const params = new URLSearchParams();

  if (perPage !== DEFAULT_PER_PAGE) {
    params.set("page", String(page));
    params.set("per_page", String(perPage));
  } else if (page > 1) {
    params.set("page", String(page));
  }

  const qs = params.toString();
  return qs ? `${url.pathname}?${qs}` : url.pathname;
}

export type PageItem = number | "ellipsis";

export function generatePageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, idx) => idx + 1);
  }

  const pages = new Set<number>();

  // Always show first 3 pages.
  pages.add(1);
  pages.add(2);
  pages.add(3);

  // Always show last 2 pages.
  pages.add(totalPages);
  pages.add(totalPages - 1);

  // Current page and neighbors.
  pages.add(currentPage);
  pages.add(currentPage - 1);
  pages.add(currentPage + 1);

  const sorted = Array.from(pages)
    .filter((p) => p >= 1 && p <= totalPages)
    .sort((a, b) => a - b);

  const items: PageItem[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const value = sorted[i];
    const prev = items.length > 0 ? items[items.length - 1] : null;
    const prevPage = typeof prev === "number" ? prev : null;

    if (prevPage !== null && value - prevPage > 1) {
      items.push("ellipsis");
    }

    items.push(value);
  }

  return items;
}


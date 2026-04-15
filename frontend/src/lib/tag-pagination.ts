import { generatePageItems, normalizePage, offsetFor, parsePage } from "./pagination";

export const DEFAULT_TAGS_PER_PAGE = 20;
export const ALLOWED_TAGS_PER_PAGE = [20, 50, 100] as const;
export type AllowedTagsPerPage = typeof ALLOWED_TAGS_PER_PAGE[number];

export function isAllowedTagsPerPage(value: number): value is AllowedTagsPerPage {
  return (ALLOWED_TAGS_PER_PAGE as readonly number[]).includes(value);
}

export function parseTagsPerPage(raw: string | null | undefined): AllowedTagsPerPage | null {
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return isAllowedTagsPerPage(value) ? value : null;
}

export function totalPagesForTags(total: number, perPage: number): number {
  if (total <= 0) return 1;
  return Math.max(1, Math.ceil(total / perPage));
}

export function buildTagsPageHref(
  baseUrl: string,
  page: number,
  perPage: number,
  existingParams?: URLSearchParams,
): string {
  const url = new URL(baseUrl, "https://blog.codewithbotina.com");
  const params = new URLSearchParams(existingParams ? existingParams.toString() : "");

  params.delete("page");
  params.delete("per_page");

  if (perPage !== DEFAULT_TAGS_PER_PAGE) {
    params.set("page", String(page));
    params.set("per_page", String(perPage));
  } else if (page > 1) {
    params.set("page", String(page));
  }

  const qs = params.toString();
  return qs ? `${url.pathname}?${qs}` : url.pathname;
}

export function getTagsPaginationState(params: URLSearchParams) {
  const requestedPerPage = parseTagsPerPage(params.get("per_page"));
  const perPage = (requestedPerPage ?? DEFAULT_TAGS_PER_PAGE) as AllowedTagsPerPage;
  const requestedPageRaw = parsePage(params.get("page"));
  const requestedPage = requestedPageRaw ?? 1;

  return { requestedPerPage, perPage, requestedPageRaw, requestedPage };
}

export function getTagsPageItems(currentPage: number, totalPages: number) {
  return generatePageItems(currentPage, totalPages);
}

export { normalizePage, offsetFor, parsePage };


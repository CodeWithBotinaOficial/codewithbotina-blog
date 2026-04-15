import { DEFAULT_SEARCH_FILTERS, type SearchFilters } from "../types/search";
import { isSupportedLanguage, type SupportedLanguage } from "./i18n";

const STORAGE_KEY = "post_search_filters_v1";

function parseCsv(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function filtersFromUrl(params: URLSearchParams, uiLanguage: SupportedLanguage): SearchFilters {
  const base = DEFAULT_SEARCH_FILTERS(uiLanguage);

  const search = (params.get("search") ?? params.get("q") ?? "").trim();
  const from = (params.get("from") ?? "").trim();
  const to = (params.get("to") ?? "").trim();
  const relevance = (params.get("relevance") ?? "").trim() as SearchFilters["relevance"];
  const sort = (params.get("sort") ?? "").trim() as SearchFilters["sort"];
  const scope = (params.get("scope") ?? "").trim() as SearchFilters["scope"];

  const tags = parseCsv(params.get("tags"));

  const langRaw = (params.get("lang") ?? "").trim();
  let languageMode: SearchFilters["languageMode"] = "current";
  let languages: SupportedLanguage[] = [];
  if (langRaw) {
    if (langRaw === "all") {
      languageMode = "all";
    } else {
      const parsed = parseCsv(langRaw)
        .map((l) => l.toLowerCase())
        .filter(isSupportedLanguage) as SupportedLanguage[];
      if (parsed.length > 0) {
        languageMode = "selected";
        languages = parsed;
      }
    }
  }

  return {
    ...base,
    search,
    from,
    to,
    tags,
    relevance: (["most_recent", "most_reactions", "most_likes", "most_dislikes", "most_comments"] as const).includes(
        relevance as any,
      )
      ? relevance
      : base.relevance,
    sort: (["newest", "oldest", "az", "za"] as const).includes(sort as any) ? sort : base.sort,
    scope: (["title", "content", "title_content", "tags"] as const).includes(scope as any) ? scope : base.scope,
    languageMode,
    languages,
  };
}

export function filtersToUrlParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);

  if (filters.relevance && filters.relevance !== "most_recent") params.set("relevance", filters.relevance);
  if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
  if (filters.scope && filters.scope !== "title") params.set("scope", filters.scope);

  if (filters.tags.length > 0) params.set("tags", filters.tags.join(","));

  if (filters.languageMode === "all") {
    params.set("lang", "all");
  } else if (filters.languageMode === "selected" && filters.languages.length > 0) {
    params.set("lang", filters.languages.join(","));
  }

  return params;
}

export function saveFiltersToStorage(filters: SearchFilters) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filters));
  } catch (_err) {
    // ignore
  }
}

export function loadFiltersFromStorage(uiLanguage: SupportedLanguage): SearchFilters | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SearchFilters>;
    if (!parsed || typeof parsed !== "object") return null;
    return {
      ...DEFAULT_SEARCH_FILTERS(uiLanguage),
      ...parsed,
      uiLanguage,
    } as SearchFilters;
  } catch (_err) {
    return null;
  }
}

export function clearFiltersFromStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch (_err) {
    // ignore
  }
}


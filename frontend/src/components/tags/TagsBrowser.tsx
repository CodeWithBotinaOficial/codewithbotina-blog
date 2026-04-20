import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Search as SearchIcon, ChevronLeft, ChevronRight } from "lucide-preact";
import { getApiUrl } from "../../lib/env";
import type { SupportedLanguage } from "../../lib/i18n";
import { SUPPORTED_LANGUAGES, t } from "../../lib/i18n";
import {
  ALLOWED_TAGS_PER_PAGE,
  DEFAULT_TAGS_PER_PAGE,
  buildTagsPageHref,
  getTagsPageItems,
  isAllowedTagsPerPage,
  normalizePage,
  offsetFor,
  parsePage,
  parseTagsPerPage,
  totalPagesForTags,
  type AllowedTagsPerPage,
} from "../../lib/tag-pagination";

type Sort = "most_used" | "az" | "za" | "recent";

type TagRow = {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  usage_count?: number | null;
  usage_count_language?: number | null;
  created_at?: string | null;
};

interface Labels {
  previous: string;
  next: string;
  page: string;
  of: string;
  perPage: string;
  show: string;
  goToPage: string; // expects {{page}}
  currentPage: string; // expects {{page}}
}

interface Props {
  uiLanguage: SupportedLanguage;
  basePath: string; // e.g. "/en/tags"
  initialQuery: string;
  initialSort: Sort;
  initialLanguageFilter: string; // "all" | "en" | "es" | ...
  initialTags: TagRow[];
  initialTotal: number;
  initialPage: number;
  initialPerPage: AllowedTagsPerPage;
  labels: Labels;
}

const API_URL = getApiUrl().replace(/\/$/, "");

function formatTemplate(template: string, data: Record<string, string | number>) {
  return Object.entries(data).reduce((acc, [key, value]) => {
    return acc.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), String(value));
  }, template);
}

function parseStateFromLocation(uiLanguage: SupportedLanguage) {
  const params = new URLSearchParams(window.location.search);
  const query = (params.get("q") ?? "").trim();
  const sort = ((params.get("sort") ?? "most_used").trim() as Sort) || "most_used";
  const languageParam = (params.get("language") ?? "").trim().toLowerCase();
  const language = languageParam || uiLanguage; // default to current UI language
  const requestedPerPage = parseTagsPerPage(params.get("per_page"));
  const perPage = (requestedPerPage ?? DEFAULT_TAGS_PER_PAGE) as AllowedTagsPerPage;
  const requestedPageRaw = parsePage(params.get("page"));
  const page = requestedPageRaw ?? 1;
  return { query, sort, language, page, perPage };
}

export default function TagsBrowser({
  uiLanguage,
  basePath,
  initialQuery,
  initialSort,
  initialLanguageFilter,
  initialTags,
  initialTotal,
  initialPage,
  initialPerPage,
  labels,
}: Props) {
  const [queryInput, setQueryInput] = useState(initialQuery);
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<Sort>(initialSort);
  const [language, setLanguage] = useState(initialLanguageFilter || uiLanguage);
  const [page, setPage] = useState(Math.max(1, initialPage || 1));
  const [perPage, setPerPage] = useState<AllowedTagsPerPage>(initialPerPage);

  const [tags, setTags] = useState<TagRow[]>(initialTags ?? []);
  const [total, setTotal] = useState<number>(typeof initialTotal === "number" ? initialTotal : (initialTags?.length ?? 0));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const debounceRef = useRef<number | null>(null);
  const didMountRef = useRef(false);
  const skipInitialFetchRef = useRef(true);
  const requestIdRef = useRef(0);

  const totalPages = useMemo(() => totalPagesForTags(total, perPage), [total, perPage]);
  const pageItems = useMemo(() => getTagsPageItems(page, totalPages), [page, totalPages]);

  const languageForApi = language || uiLanguage;

  const urlParamsForState = (next: { query: string; sort: Sort; language: string }) => {
    const params = new URLSearchParams();
    if (next.query.trim()) params.set("q", next.query.trim());
    if (next.sort && next.sort !== "most_used") params.set("sort", next.sort);
    // Keep URLs clean: omit when it's the current UI language, but still send it to the API.
    if (next.language && next.language !== uiLanguage) params.set("language", next.language);
    return params;
  };

  // Debounced apply for the query input.
  useEffect(() => {
    if (!didMountRef.current) return;
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    const trimmed = queryInput.trim();
    if (!trimmed) {
      // Clearing should apply immediately so the URL returns to the normal `/tags` route quickly.
      setPage(1);
      setQuery("");
      return;
    }

    debounceRef.current = window.setTimeout(() => {
      setPage(1);
      setQuery(trimmed);
    }, 450);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [queryInput]);

  // Sync with browser navigation.
  useEffect(() => {
    didMountRef.current = true;

    const onPopState = () => {
      const next = parseStateFromLocation(uiLanguage);
      setQueryInput(next.query);
      setQuery(next.query);
      setSort(next.sort);
      setLanguage(next.language);
      setPerPage(next.perPage);
      setPage(Math.max(1, next.page));
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  // Client-side preference: if no per_page in URL, apply localStorage value.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPerPageRaw = params.get("per_page");
    if (urlPerPageRaw) return;
    const storedRaw = window.localStorage.getItem("tags_per_page");
    const stored = storedRaw ? Number(storedRaw) : NaN;
    if (!Number.isFinite(stored)) return;
    if (!isAllowedTagsPerPage(stored)) return;
    if (stored === perPage) return;
    setPerPage(stored);
    setPage(1);
  }, []);

  // Fetch tags + update URL when state changes.
  useEffect(() => {
    if (!didMountRef.current) return;

    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    const params = urlParamsForState({ query, sort, language });
    const href = buildTagsPageHref(basePath, page, perPage, params);
    const current = `${window.location.pathname}${window.location.search}`;
    if (href !== current) history.pushState({}, "", href);

    const id = ++requestIdRef.current;
    const ac = new AbortController();
    setLoading(true);
    setError(null);

    (async () => {
      try {
        const api = new URL(`${API_URL}/api/tags`);
        if (query.trim()) api.searchParams.set("q", query.trim());
        if (sort) api.searchParams.set("sort", sort);
        api.searchParams.set("language", languageForApi);
        api.searchParams.set("limit", String(perPage));
        api.searchParams.set("offset", String(offsetFor(page, perPage)));

        const res = await fetch(api.toString(), {
          signal: ac.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`Failed to fetch tags (${res.status})`);
        const payload = await res.json();
        const data = payload?.data ?? payload;
        if (requestIdRef.current !== id) return;

        const nextTags = (data?.tags ?? []) as TagRow[];
        const nextTotal = typeof data?.total === "number" ? (data.total as number) : nextTags.length;
        setTags(nextTags);
        setTotal(nextTotal);
      } catch (e) {
        if (ac.signal.aborted) return;
        if (requestIdRef.current !== id) return;
        setError(e instanceof Error ? e.message : "Failed to fetch tags");
      } finally {
        if (requestIdRef.current === id) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [query, sort, language, page, perPage, basePath, uiLanguage]);

  // If the total changes such that the current page is out of range, clamp.
  useEffect(() => {
    if (!didMountRef.current) return;
    const clamped = normalizePage(page, totalPages);
    if (clamped !== page) setPage(clamped);
  }, [totalPages]);

  const applyNow = () => {
    setPage(1);
    setQuery(queryInput.trim());
  };

  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <div>
      <div class="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
        <div class="flex flex-col md:flex-row gap-3 md:items-center">
          <div class="relative flex-1">
            <div class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none">
              <SearchIcon className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={queryInput}
              onInput={(e) => setQueryInput((e.target as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyNow();
                }
              }}
              placeholder={t(uiLanguage, "tagPage.searchTags")}
              class="w-full rounded-lg border border-[var(--color-border)] bg-white pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
            />
          </div>

          <select
            value={sort}
            onChange={(e) => {
              const nextSort = (e.target as HTMLSelectElement).value as Sort;
              setSort(nextSort);
              setPage(1);
            }}
            class="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
            aria-label={t(uiLanguage, "tagPage.sortBy")}
          >
            <option value="most_used">{t(uiLanguage, "tagPage.mostUsed")}</option>
            <option value="az">{t(uiLanguage, "tagPage.alphabeticalAZ")}</option>
            <option value="za">{t(uiLanguage, "tagPage.alphabeticalZA")}</option>
            <option value="recent">{t(uiLanguage, "tagPage.recent")}</option>
          </select>

          <select
            value={language}
            onChange={(e) => {
              const nextLang = (e.target as HTMLSelectElement).value;
              setLanguage(nextLang);
              setPage(1);
            }}
            class="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
            aria-label={t(uiLanguage, "tagPage.language")}
          >
            <option value={uiLanguage}>{t(uiLanguage, "tagPage.currentLanguage")}</option>
            <option value="all">{t(uiLanguage, "tagPage.allLanguages")}</option>
            {SUPPORTED_LANGUAGES.filter((l) => l !== uiLanguage).map((l) => (
              <option key={l} value={l}>
                {l.toUpperCase()}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => applyNow()}
            class="rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
          >
            {t(uiLanguage, "search.apply")}
          </button>
        </div>
      </div>

      {error ? (
        <div class="text-center py-12">
          <p class="text-xl text-[var(--color-error)]">{t(uiLanguage, "errors.fetchPosts")}</p>
        </div>
      ) : loading ? (
        <div class="text-center py-12 text-[var(--color-text-secondary)]">
          {t(uiLanguage, "search.searching")}
        </div>
      ) : tags.length === 0 ? (
        <div class="text-center py-12 text-[var(--color-text-secondary)]">
          {t(uiLanguage, "tagsEmpty", "post")}
        </div>
      ) : (
        <>
          <div class="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tags.map((tag) => {
              const count = tag.usage_count_language ?? tag.usage_count ?? 0;
              const usageLabel = t(uiLanguage, "tagPage.postsCount", "common", { count });
              return (
                <a
                  href={`/${uiLanguage}/tags/${tag.slug}`}
                  class="border border-[var(--color-border)] rounded-xl p-5 hover:shadow-lg transition"
                >
                  <p class="text-lg font-semibold mb-1">#{tag.name}</p>
                  <p class="text-sm text-[var(--color-text-secondary)]">
                    {tag.description || t(uiLanguage, "tagDescriptionFallback", "post")}
                  </p>
                  <p class="text-xs text-[var(--color-text-tertiary)] mt-3">{usageLabel}</p>
                </a>
              );
            })}
          </div>

          <div class="mt-12 flex flex-col gap-4 border-t border-[var(--color-border)] pt-8">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <nav class="flex items-center justify-center sm:justify-start gap-2 flex-wrap" aria-label="Pagination">
                <button
                  type="button"
                  class={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    hasPrev
                      ? "border-[var(--color-border)] bg-white text-[var(--color-text-primary)] hover:border-[var(--color-accent-primary)]/40 hover:bg-[var(--color-bg-subtle)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] cursor-not-allowed"
                  }`}
                  onClick={() => {
                    if (!hasPrev) return;
                    setPage((p) => Math.max(1, p - 1));
                  }}
                  disabled={!hasPrev}
                  aria-label={labels.previous}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span class="hidden sm:inline">{labels.previous}</span>
                </button>

                <div class="hidden md:flex items-center gap-1">
                  {pageItems.map((item, idx) => {
                    if (item === "ellipsis") {
                      return (
                        <span key={`e-${idx}`} class="px-2 text-sm text-[var(--color-text-tertiary)]" aria-hidden="true">
                          ...
                        </span>
                      );
                    }

                    const isCurrent = item === page;
                    return (
                      <button
                        key={item}
                        type="button"
                        class={`min-w-[40px] h-10 rounded-lg border px-3 text-sm font-semibold transition ${
                          isCurrent
                            ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] text-white"
                            : "border-[var(--color-border)] bg-white text-[var(--color-text-primary)] hover:border-[var(--color-accent-primary)]/40 hover:bg-[var(--color-bg-subtle)]"
                        }`}
                        aria-current={isCurrent ? "page" : undefined}
                        aria-label={isCurrent
                          ? formatTemplate(labels.currentPage, { page: item })
                          : formatTemplate(labels.goToPage, { page: item })}
                        onClick={() => {
                          if (isCurrent) return;
                          setPage(item);
                        }}
                      >
                        {item}
                      </button>
                    );
                  })}
                </div>

                <div class="md:hidden px-2 text-sm font-semibold text-[var(--color-text-secondary)]">
                  {labels.page} {page} {labels.of} {totalPages}
                </div>

                <button
                  type="button"
                  class={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                    hasNext
                      ? "border-[var(--color-border)] bg-white text-[var(--color-text-primary)] hover:border-[var(--color-accent-primary)]/40 hover:bg-[var(--color-bg-subtle)]"
                      : "border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] cursor-not-allowed"
                  }`}
                  onClick={() => {
                    if (!hasNext) return;
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                  disabled={!hasNext}
                  aria-label={labels.next}
                >
                  <span class="hidden sm:inline">{labels.next}</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </nav>

              <div class="flex items-center justify-center sm:justify-end gap-2">
                <span class="hidden sm:inline text-sm font-semibold text-[var(--color-text-secondary)]">
                  {labels.perPage}
                </span>
                <span class="sm:hidden text-sm font-semibold text-[var(--color-text-secondary)]">
                  {labels.show}
                </span>
                <select
                  class="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                  value={String(perPage)}
                  onChange={(event) => {
                    const next = Number((event.target as HTMLSelectElement).value);
                    const nextPerPage = (isAllowedTagsPerPage(next) ? next : DEFAULT_TAGS_PER_PAGE) as AllowedTagsPerPage;
                    window.localStorage.setItem("tags_per_page", String(nextPerPage));
                    setPerPage(nextPerPage);
                    setPage(1);
                  }}
                  aria-label={labels.perPage}
                >
                  {ALLOWED_TAGS_PER_PAGE.map((value) => (
                    <option key={value} value={String(value)}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

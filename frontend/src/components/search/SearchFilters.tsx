import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Search as SearchIcon, X, Calendar, SlidersHorizontal } from "lucide-preact";
import { getApiUrl } from "../../lib/env";
import { clearFiltersFromStorage, loadFiltersFromStorage, saveFiltersToStorage } from "../../lib/search-filters";
import { LANGUAGE_NAMES, SUPPORTED_LANGUAGES, t, type SupportedLanguage } from "../../lib/i18n";
import { DEFAULT_SEARCH_FILTERS, type SearchFilters as SearchFiltersType } from "../../types/search";

type Tag = { id?: string; name: string; slug: string; usage_count?: number | null };

export interface SearchFiltersProps {
  onSearch: (filters: SearchFiltersType) => void;
  showLanguageFilter?: boolean;
  showScopeFilter?: boolean;
  compact?: boolean;
  initialFilters?: SearchFiltersType;
  // Not in the original spec, but useful for reusing the component on tag pages.
  showTagFilter?: boolean;
  // If enabled, typing in the main search box will trigger an apply after a debounce.
  autoApplySearch?: boolean;
}

const API_URL = getApiUrl().replace(/\/$/, "");

function todayIso(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseDateIso(value: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function isFutureIso(value: string): boolean {
  const d = parseDateIso(value);
  if (!d) return false;
  const today = parseDateIso(todayIso())!;
  return d.getTime() > today.getTime();
}

export default function SearchFilters({
  onSearch,
  showLanguageFilter = true,
  showScopeFilter = true,
  showTagFilter = true,
  compact = false,
  initialFilters,
  autoApplySearch = true,
}: SearchFiltersProps) {
  const uiLanguage = initialFilters?.uiLanguage ?? "en";
  const defaultFilters = useMemo(() => DEFAULT_SEARCH_FILTERS(uiLanguage), [uiLanguage]);

  const [filters, setFilters] = useState<SearchFiltersType>(() => initialFilters ?? defaultFilters);
  const [errors, setErrors] = useState<{ date?: string }>({});
  const [filtersOpen, setFiltersOpen] = useState(!compact);

  // Tags UI state.
  const [tagQuery, setTagQuery] = useState("");
  const [popularTags, setPopularTags] = useState<Tag[]>([]);
  const [tagSuggestions, setTagSuggestions] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<Tag[]>(() =>
    (initialFilters?.tags ?? []).map((slug) => ({ slug, name: slug })),
  );
  const tagDebounceRef = useRef<number | null>(null);
  const searchDebounceRef = useRef<number | null>(null);
  const didMountRef = useRef(false);

  // If no initialFilters were provided, use localStorage as a client-side convenience.
  useEffect(() => {
    if (initialFilters) return;
    const stored = loadFiltersFromStorage(uiLanguage);
    if (stored) {
      setFilters(stored);
      setSelectedTags((stored.tags ?? []).map((slug) => ({ slug, name: slug })));
    }
  }, []);

  useEffect(() => {
    if (!showTagFilter) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/tags?sort=most_used&limit=10&offset=0`);
        if (!res.ok) return;
        const payload = await res.json();
        const tags = (payload?.data?.tags ?? payload?.tags ?? []) as Tag[];
        if (!cancelled) setPopularTags(tags);
      } catch (_err) {
        // ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [showTagFilter]);

  useEffect(() => {
    if (!showTagFilter) return;
    if (tagDebounceRef.current) window.clearTimeout(tagDebounceRef.current);

    const q = tagQuery.trim();
    if (q.length < 2) {
      setTagSuggestions([]);
      return;
    }

    tagDebounceRef.current = window.setTimeout(async () => {
      try {
        const res = await fetch(`${API_URL}/api/tags/autocomplete?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const payload = await res.json();
        const tags = (payload?.data?.tags ?? payload?.tags ?? []) as Tag[];
        setTagSuggestions(tags);
      } catch (_err) {
        // ignore
      }
    }, 350);

    return () => {
      if (tagDebounceRef.current) window.clearTimeout(tagDebounceRef.current);
    };
  }, [tagQuery, showTagFilter]);

  // Debounced auto-apply for the main search input (matches prior UX, but now searches the full dataset).
  useEffect(() => {
    if (!autoApplySearch) return;
    if (!didMountRef.current) {
      didMountRef.current = true;
      return;
    }

    if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = window.setTimeout(() => {
      // Avoid spamming navigation for single-character terms.
      const term = filters.search.trim();
      if (term.length === 0 || term.length >= 2) {
        commitSearch(filters);
      }
    }, 450);

    return () => {
      if (searchDebounceRef.current) window.clearTimeout(searchDebounceRef.current);
    };
  }, [filters.search, autoApplySearch]);

  const validate = (next: SearchFiltersType): boolean => {
    const from = next.from;
    const to = next.to;

    if (from && isFutureIso(from)) {
      setErrors({ date: t(uiLanguage, "search.futureDateNotAllowed") });
      return false;
    }
    if (to && isFutureIso(to)) {
      setErrors({ date: t(uiLanguage, "search.futureDateNotAllowed") });
      return false;
    }
    if (from && to) {
      const fd = parseDateIso(from);
      const td = parseDateIso(to);
      if (fd && td && td.getTime() < fd.getTime()) {
        setErrors({ date: t(uiLanguage, "search.invalidDateRange") });
        return false;
      }
    }

    setErrors({});
    return true;
  };

  const commitSearch = (next: SearchFiltersType) => {
    if (!validate(next)) return;
    saveFiltersToStorage(next);
    onSearch(next);
  };

  const resetAll = () => {
    const next = DEFAULT_SEARCH_FILTERS(uiLanguage);
    setFilters(next);
    setSelectedTags([]);
    setTagQuery("");
    setTagSuggestions([]);
    setErrors({});
    clearFiltersFromStorage();
    onSearch(next);
  };

  const updateTags = (nextSelected: Tag[]) => {
    setSelectedTags(nextSelected);
    setFilters((prev) => ({
      ...prev,
      tags: nextSelected.map((t) => t.slug),
    }));
  };

  const toggleSelectedTag = (tag: Tag) => {
    const exists = selectedTags.some((t) => t.slug === tag.slug);
    if (exists) {
      updateTags(selectedTags.filter((t) => t.slug !== tag.slug));
    } else {
      updateTags([...selectedTags, tag]);
    }
  };

  const showPopular = showTagFilter && tagQuery.trim().length === 0;
  const tagOptions = showPopular ? popularTags : tagSuggestions;

  return (
    <div class={`w-full ${compact ? "max-w-3xl" : "max-w-5xl"} mx-auto`}>
      <div class="relative">
        <div class="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none">
          <SearchIcon className="h-5 w-5" />
        </div>
        <input
          type="text"
          value={filters.search}
          onInput={(e) => {
            const value = (e.target as HTMLInputElement).value;
            setFilters((prev) => ({ ...prev, search: value }));
          }}
          placeholder={t(uiLanguage, "search.placeholder")}
          class="w-full pl-12 pr-12 py-4 rounded-full border border-[var(--color-border)] bg-white shadow-sm focus:ring-2 focus:ring-[var(--color-accent-primary)] focus:border-transparent outline-none transition-all"
        />
        {filters.search.trim() ? (
          <button
            type="button"
            class="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)]"
            aria-label={t(uiLanguage, "search.clear")}
            onClick={() => setFilters((prev) => ({ ...prev, search: "" }))}
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <div class="mt-4 flex items-center justify-between gap-3">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
          onClick={() => setFiltersOpen((v) => !v)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          {t(uiLanguage, "search.filters")}
        </button>

        <div class="flex items-center gap-2">
          <button
            type="button"
            class="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
            onClick={resetAll}
          >
            {t(uiLanguage, "search.reset")}
          </button>
          <button
            type="button"
            class="rounded-lg bg-[var(--color-accent-primary)] px-4 py-2 text-sm font-semibold text-white hover:opacity-95"
            onClick={() => commitSearch(filters)}
          >
            {t(uiLanguage, "search.apply")}
          </button>
        </div>
      </div>

      {filtersOpen ? (
        <div class="mt-4 rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="rounded-xl border border-[var(--color-border)] p-4">
              <div class="flex items-center gap-2 text-sm font-semibold text-[var(--color-text-primary)]">
                <Calendar className="h-4 w-4" />
                {t(uiLanguage, "search.dateRange")}
              </div>
              <div class="mt-3 grid grid-cols-1 gap-2">
                <label class="text-xs font-semibold text-[var(--color-text-tertiary)]">
                  {t(uiLanguage, "search.from")}
                </label>
                <input
                  type="date"
                  lang="en-GB"
                  max={todayIso()}
                  value={filters.from}
                  onChange={(e) => setFilters((prev) => ({ ...prev, from: (e.target as HTMLInputElement).value }))}
                  class="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                />
                <label class="mt-2 text-xs font-semibold text-[var(--color-text-tertiary)]">
                  {t(uiLanguage, "search.to")}
                </label>
                <input
                  type="date"
                  lang="en-GB"
                  max={todayIso()}
                  value={filters.to}
                  onChange={(e) => setFilters((prev) => ({ ...prev, to: (e.target as HTMLInputElement).value }))}
                  class="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                />
                {filters.from || filters.to ? (
                  <button
                    type="button"
                    class="mt-2 text-left text-xs font-semibold text-[var(--color-accent-primary)] hover:underline"
                    onClick={() => setFilters((prev) => ({ ...prev, from: "", to: "" }))}
                  >
                    {t(uiLanguage, "search.reset")}
                  </button>
                ) : null}
                {errors.date ? (
                  <p class="mt-2 text-xs font-semibold text-[var(--color-error)]">{errors.date}</p>
                ) : null}
              </div>
            </div>

            <div class="rounded-xl border border-[var(--color-border)] p-4">
              <label class="block text-sm font-semibold text-[var(--color-text-primary)]">
                {t(uiLanguage, "search.relevance")}
              </label>
              <select
                class="mt-3 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                value={filters.relevance}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, relevance: (e.target as HTMLSelectElement).value as any }))
                }
              >
                <option value="most_recent">{t(uiLanguage, "search.mostRecent")}</option>
                <option value="most_reactions">{t(uiLanguage, "search.mostReactions")}</option>
                <option value="most_likes">{t(uiLanguage, "search.mostLikes")}</option>
                <option value="most_dislikes">{t(uiLanguage, "search.mostDislikes")}</option>
                <option value="most_comments">{t(uiLanguage, "search.mostComments")}</option>
              </select>

              <label class="mt-4 block text-sm font-semibold text-[var(--color-text-primary)]">
                {t(uiLanguage, "search.sortOrder")}
              </label>
              <select
                class="mt-3 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                value={filters.sort}
                onChange={(e) => setFilters((prev) => ({ ...prev, sort: (e.target as HTMLSelectElement).value as any }))}
              >
                <option value="newest">{t(uiLanguage, "search.newestFirst")}</option>
                <option value="oldest">{t(uiLanguage, "search.oldestFirst")}</option>
                <option value="az">{t(uiLanguage, "search.alphaAZ")}</option>
                <option value="za">{t(uiLanguage, "search.alphaZA")}</option>
              </select>
            </div>

            {showScopeFilter ? (
              <div class="rounded-xl border border-[var(--color-border)] p-4">
                <label class="block text-sm font-semibold text-[var(--color-text-primary)]">
                  {t(uiLanguage, "search.scope")}
                </label>
                <select
                  class="mt-3 w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                  value={filters.scope}
                  onChange={(e) =>
                    setFilters((prev) => ({ ...prev, scope: (e.target as HTMLSelectElement).value as any }))
                  }
                >
                  <option value="title">{t(uiLanguage, "search.titleOnly")}</option>
                  <option value="content">{t(uiLanguage, "search.contentOnly")}</option>
                  <option value="title_content">{t(uiLanguage, "search.titleAndContent")}</option>
                  <option value="tags">{t(uiLanguage, "search.tagsOnly")}</option>
                </select>
                <p class="mt-2 text-xs text-[var(--color-text-tertiary)]">
                  {t(uiLanguage, "search.scopeHint")}
                </p>
              </div>
            ) : null}
          </div>

          {showTagFilter ? (
            <div class="mt-4 rounded-xl border border-[var(--color-border)] p-4">
              <label class="block text-sm font-semibold text-[var(--color-text-primary)]">
                {t(uiLanguage, "search.tags")}
              </label>
              <div class="mt-3">
                <input
                  type="text"
                  value={tagQuery}
                  onInput={(e) => setTagQuery((e.target as HTMLInputElement).value)}
                  placeholder={t(uiLanguage, "search.searchTags")}
                  class="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
                />
              </div>

              {selectedTags.length > 0 ? (
                <div class="mt-3 flex flex-wrap gap-2">
                  {selectedTags.map((tag) => (
                    <button
                      key={tag.slug}
                      type="button"
                      class="inline-flex items-center gap-2 rounded-full bg-[var(--color-bg-subtle)] px-3 py-1 text-xs font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-accent-light)]"
                      onClick={() => toggleSelectedTag(tag)}
                      aria-label={`Remove ${tag.name}`}
                    >
                      <span>#{tag.name}</span>
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              ) : null}

              <div class="mt-4">
                <p class="text-xs font-semibold text-[var(--color-text-tertiary)]">
                  {showPopular ? t(uiLanguage, "search.popularTags") : t(uiLanguage, "search.searchResultsTags")}
                </p>
                <div class="mt-2 flex flex-wrap gap-2">
                  {tagOptions.map((tag) => {
                    const active = selectedTags.some((t) => t.slug === tag.slug);
                    return (
                      <button
                        key={tag.slug}
                        type="button"
                        class={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                          active
                            ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] text-white"
                            : "border-[var(--color-border)] bg-white text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
                        }`}
                        onClick={() => toggleSelectedTag(tag)}
                      >
                        #{tag.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {showLanguageFilter ? (
            <div class="mt-4 rounded-xl border border-[var(--color-border)] p-4">
              <p class="text-sm font-semibold text-[var(--color-text-primary)]">
                {t(uiLanguage, "search.language")}
              </p>

              <div class="mt-3 flex flex-wrap gap-3">
                <label class="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <input
                    type="radio"
                    name="lang-mode"
                    checked={filters.languageMode === "current"}
                    onChange={() => setFilters((prev) => ({ ...prev, languageMode: "current", languages: [] }))}
                  />
                  {t(uiLanguage, "search.currentLanguage")}
                </label>
                <label class="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <input
                    type="radio"
                    name="lang-mode"
                    checked={filters.languageMode === "all"}
                    onChange={() => setFilters((prev) => ({ ...prev, languageMode: "all", languages: [] }))}
                  />
                  {t(uiLanguage, "search.allLanguages")}
                </label>
                <label class="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
                  <input
                    type="radio"
                    name="lang-mode"
                    checked={filters.languageMode === "selected"}
                    onChange={() => setFilters((prev) => ({ ...prev, languageMode: "selected" }))}
                  />
                  {t(uiLanguage, "search.selectLanguages")}
                </label>
              </div>

              {filters.languageMode === "selected" ? (
                <div class="mt-3 flex flex-wrap gap-3">
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <label
                      key={lang}
                      class="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-text-secondary)]"
                    >
                      <input
                        type="checkbox"
                        checked={filters.languages.includes(lang)}
                        onChange={(e) => {
                          const checked = (e.target as HTMLInputElement).checked;
                          setFilters((prev) => ({
                            ...prev,
                            languages: checked
                              ? [...prev.languages, lang]
                              : prev.languages.filter((l) => l !== lang),
                          }));
                        }}
                      />
                      {LANGUAGE_NAMES[lang] ?? lang.toUpperCase()}
                    </label>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

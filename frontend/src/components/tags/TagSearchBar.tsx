import { useEffect, useRef, useState } from "preact/hooks";
import { Search as SearchIcon } from "lucide-preact";
import type { SupportedLanguage } from "../../lib/i18n";
import { SUPPORTED_LANGUAGES, t } from "../../lib/i18n";

type Sort = "most_used" | "az" | "za" | "recent";

interface Props {
  uiLanguage: SupportedLanguage;
  basePath: string; // e.g. "/en/tags"
  initialQuery: string;
  initialSort: Sort;
  initialLanguageFilter: string; // "all" | "en" | "es" | ...
}

export default function TagSearchBar({
  uiLanguage,
  basePath,
  initialQuery,
  initialSort,
  initialLanguageFilter,
}: Props) {
  const [query, setQuery] = useState(initialQuery);
  const [sort, setSort] = useState<Sort>(initialSort);
  const [language, setLanguage] = useState(initialLanguageFilter);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    setQuery(initialQuery);
  }, [initialQuery]);
  useEffect(() => {
    setSort(initialSort);
  }, [initialSort]);
  useEffect(() => {
    setLanguage(initialLanguageFilter);
  }, [initialLanguageFilter]);

  const applyWith = (next: { query: string; sort: Sort; language: string }) => {
    const params = new URLSearchParams(window.location.search);
    params.delete("page"); // reset pagination on filter change

    const q = next.query.trim();
    if (q) params.set("q", q);
    else params.delete("q");

    if (next.sort && next.sort !== "most_used") params.set("sort", next.sort);
    else params.delete("sort");

    if (next.language && next.language !== uiLanguage) params.set("language", next.language);
    else params.delete("language");

    const qs = params.toString();
    window.location.assign(qs ? `${basePath}?${qs}` : basePath);
  };

  // Debounced live filtering for tag name search.
  useEffect(() => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current);
    debounceRef.current = window.setTimeout(() => applyWith({ query, sort, language }), 450);
    return () => {
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <div class="rounded-2xl border border-[var(--color-border)] bg-white p-4 shadow-sm">
      <div class="flex flex-col md:flex-row gap-3 md:items-center">
        <div class="relative flex-1">
          <div class="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-tertiary)] pointer-events-none">
            <SearchIcon className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={query}
            onInput={(e) => setQuery((e.target as HTMLInputElement).value)}
            placeholder={t(uiLanguage, "tagPage.searchTags")}
            class="w-full rounded-lg border border-[var(--color-border)] bg-white pl-10 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
          />
        </div>

        <select
          value={sort}
          onChange={(e) => {
            const nextSort = (e.target as HTMLSelectElement).value as Sort;
            setSort(nextSort);
            window.setTimeout(() => applyWith({ query, sort: nextSort, language }), 0);
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
            window.setTimeout(() => applyWith({ query, sort, language: nextLang }), 0);
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
          onClick={() => applyWith({ query, sort, language })}
          class="rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
        >
          {t(uiLanguage, "search.apply")}
        </button>
      </div>
    </div>
  );
}

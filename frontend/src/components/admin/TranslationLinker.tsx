import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Search, X } from "lucide-preact";
import { getApiUrl } from "../../lib/env";

export interface TranslationPost {
  post_id: string;
  language: string;
  slug: string;
  titulo: string;
  fecha?: string | null;
  imagen_url?: string | null;
}

export interface TranslationLinkerLabels {
  title: string;
  empty: string;
  searchPlaceholder: string;
  searching: string;
  noResults: string;
  removeLabel: string;
  languageLabel: string;
  dateLabel: string;
}

interface Props {
  currentPostId?: string;
  currentPostLanguage: string;
  selected: TranslationPost[];
  onChange: (next: TranslationPost[]) => void;
  labels: TranslationLinkerLabels;
  uiLocale?: string; // e.g. "en-US" or "es-ES"
  disabled?: boolean;
}

const API_URL = getApiUrl().replace(/\/$/, "");

function formatDate(value?: string | null, locale = "en-US"): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale, { year: "numeric", month: "short", day: "2-digit" }).format(date);
}

function languageBadge(lang: string): string {
  return lang.trim().toUpperCase();
}

export default function TranslationLinker(
  { currentPostId, currentPostLanguage, selected, onChange, labels, uiLocale, disabled }: Props,
) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<TranslationPost[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const selectedLanguageSet = useMemo(() => new Set(selected.map((p) => p.language)), [selected]);
  const currentLang = currentPostLanguage.trim().toLowerCase();

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_URL}/api/posts?q=${encodeURIComponent(q)}&limit=12`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Search failed");
        const payload = await res.json();
        const posts = (payload?.data?.posts ?? payload?.posts ?? []) as any[];

        const mapped: TranslationPost[] = posts.map((p) => ({
          post_id: String(p.id),
          language: String(p.language ?? "").trim().toLowerCase(),
          slug: String(p.slug ?? ""),
          titulo: String(p.titulo ?? ""),
          fecha: p.fecha ?? null,
          imagen_url: p.imagen_url ?? null,
        }));

        const filtered = mapped
          .filter((p) => p.post_id && p.slug && p.titulo)
          .filter((p) => (currentPostId ? p.post_id !== currentPostId : true))
          .filter((p) => p.language && p.language !== currentLang)
          .filter((p) => !selected.some((sel) => sel.post_id === p.post_id));

        if (!cancelled) {
          setResults(filtered);
          setOpen(true);
        }
      } catch (_e) {
        if (!cancelled) setError(labels.noResults);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, currentPostId, currentLang, selected, labels.noResults]);

  const add = (post: TranslationPost) => {
    const lang = post.language.trim().toLowerCase();
    if (!lang || lang === currentLang) return;
    if (selectedLanguageSet.has(lang)) return;
    onChange([...selected, { ...post, language: lang }]);
    setQuery("");
    setOpen(false);
    setResults([]);
  };

  const remove = (postId: string) => {
    onChange(selected.filter((p) => p.post_id !== postId));
  };

  const disabledLanguages = selectedLanguageSet;

  return (
    <section class="rounded-2xl border border-[var(--color-border)] bg-white p-5 space-y-4" ref={containerRef}>
      <div class="flex items-center justify-between gap-4">
        <h2 class="text-sm font-semibold tracking-wide uppercase text-[var(--color-text-tertiary)]">
          {labels.title}
        </h2>
      </div>

      {selected.length === 0 ? (
        <p class="text-sm text-[var(--color-text-tertiary)]">{labels.empty}</p>
      ) : (
        <div class="flex flex-wrap gap-2">
          {selected.map((item) => (
            <span
              key={item.post_id}
              class="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-1 text-sm"
            >
              <span class="text-[10px] font-bold tracking-wide text-[var(--color-accent-primary)]">
                {languageBadge(item.language)}
              </span>
              <span class="text-[var(--color-text-secondary)] truncate max-w-[240px]">
                {item.titulo}
              </span>
              <button
                type="button"
                disabled={disabled}
                aria-label={labels.removeLabel}
                class="rounded-full p-1 text-[var(--color-text-tertiary)] hover:text-[var(--color-error)] disabled:opacity-50"
                onClick={() => remove(item.post_id)}
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div class="relative">
        <div class="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--color-text-tertiary)]" />
          <input
            type="text"
            value={query}
            disabled={disabled}
            onFocus={() => {
              if (results.length > 0) setOpen(true);
            }}
            onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
            placeholder={labels.searchPlaceholder}
            class="input-field pl-10"
          />
        </div>

        {open ? (
          <div class="absolute z-50 mt-2 w-full overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-lg">
            {loading ? (
              <div class="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">{labels.searching}</div>
            ) : error ? (
              <div class="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">{error}</div>
            ) : results.length === 0 ? (
              <div class="px-4 py-3 text-sm text-[var(--color-text-tertiary)]">{labels.noResults}</div>
            ) : (
              <ul class="max-h-72 overflow-auto">
                {results.map((item) => {
                  const lang = item.language.trim().toLowerCase();
                  const langTaken = disabledLanguages.has(lang);
                  return (
                    <li key={item.post_id}>
                      <button
                        type="button"
                        disabled={disabled || langTaken}
                        onClick={() => add(item)}
                        class={`w-full px-4 py-3 text-left transition ${
                          langTaken
                            ? "cursor-not-allowed opacity-50"
                            : "hover:bg-[var(--color-bg-subtle)]"
                        }`}
                      >
                        <div class="flex items-start justify-between gap-3">
                          <div class="min-w-0">
                            <div class="font-semibold text-[var(--color-text-primary)] truncate">
                              {item.titulo}
                            </div>
                            <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                              <span class="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5">
                                <span class="font-bold">{labels.languageLabel}:</span> {languageBadge(lang)}
                              </span>
                              {item.fecha ? (
                                <span class="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2 py-0.5">
                                  <span class="font-bold">{labels.dateLabel}:</span> {formatDate(item.fecha, uiLocale)}
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}


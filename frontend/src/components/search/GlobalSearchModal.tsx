import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Search as SearchIcon } from "lucide-preact";
import Modal from "../ui/Modal";
import SearchFilters from "./SearchFilters";
import { getApiUrl } from "../../lib/env";
import { DEFAULT_SEARCH_FILTERS } from "../../types/search";
import type { SupportedLanguage } from "../../lib/i18n";
import { t } from "../../lib/i18n";

interface Props {
  currentLanguage: SupportedLanguage;
}

type SearchResultPost = {
  id: string;
  titulo: string;
  slug: string;
  body: string;
  imagen_url: string | null;
  fecha: string | null;
  language: SupportedLanguage | string;
  likes_count?: number;
  dislikes_count?: number;
  reactions_count?: number;
  comments_count?: number;
};

type SearchResponseData = {
  posts: SearchResultPost[];
  total: number;
  limit: number;
  offset: number;
  phase?: "title" | "content" | "tags" | "none";
};

const API_URL = getApiUrl().replace(/\/$/, "");

function stripHtml(value: string): string {
  return String(value ?? "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
}

function stripMarkdown(value: string): string {
  if (!value) return "";
  let s = String(value);
  // Remove code blocks
  s = s.replace(/```[\s\S]*?```/g, " ");
  // Remove inline code
  s = s.replace(/`([^`]*)`/g, "$1");
  // Images: ![alt](url) -> alt
  s = s.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Links: [text](url) -> text
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  // Headings and blockquote markers
  s = s.replace(/^#+\s+/gm, "");
  s = s.replace(/^>\s+/gm, "");
  // Remove emphasis characters
  s = s.replace(/\*\*(.*?)\*\*/g, "$1");
  s = s.replace(/\*(.*?)\*/g, "$1");
  s = s.replace(/__(.*?)__/g, "$1");
  s = s.replace(/_(.*?)_/g, "$1");
  // Remove list markers
  s = s.replace(/^[\-\*\+]\s+/gm, "");
  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

function formatDateShort(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export default function GlobalSearchModal({ currentLanguage }: Props) {
  const [open, setOpen] = useState(false);
  const initial = useMemo(() => DEFAULT_SEARCH_FILTERS(currentLanguage), [currentLanguage]);
  const [results, setResults] = useState<SearchResponseData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const runSearch = async (filters: ReturnType<typeof DEFAULT_SEARCH_FILTERS>) => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      const q = filters.search.trim();
      if (q) params.set("q", q);
      if (filters.from) params.set("from", filters.from);
      if (filters.to) params.set("to", filters.to);
      if (filters.relevance && filters.relevance !== "most_recent") params.set("relevance", filters.relevance);
      if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
      if (filters.scope && filters.scope !== "title") params.set("scope", filters.scope);
      if (filters.tags.length > 0) params.set("tags", filters.tags.join(","));

      if (filters.languageMode === "all") {
        params.set("languages", "all");
      } else if (filters.languageMode === "selected" && filters.languages.length > 0) {
        params.set("languages", filters.languages.join(","));
      } else {
        params.set("language", filters.uiLanguage);
      }

      params.set("limit", "20");
      params.set("offset", "0");

      // Primary search endpoint; fall back to legacy /api/search if we get
      // a non-JSON response (some deployments may route the newer path to
      // HTML pages).
      let res = await fetch(`${API_URL}/api/posts/search?${params.toString()}`);
      if (!res.ok) throw new Error(`Search failed (${res.status})`);
      let contentType = res.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json")) {
        // Try /api/search as a compatibility fallback
        try {
          const fallback = await fetch(`${API_URL}/api/search?${params.toString()}`);
          const fallbackCt = fallback.headers.get("content-type") ?? "";
          if (fallback.ok && fallbackCt.includes("application/json")) {
            res = fallback;
            contentType = fallbackCt;
          } else {
            throw new Error(`Expected JSON response but got: ${contentType}`);
          }
        } catch (_e) {
          throw new Error(`Expected JSON response but got: ${contentType}`);
        }
      }
      let payload: any = null;
      try {
        payload = await res.json();
      } catch (err) {
        throw new Error("Failed to parse JSON response from search API");
      }
      const data = (payload?.data ?? payload) as Partial<SearchResponseData>;

      if (requestIdRef.current !== requestId) return;
      setResults({
        posts: Array.isArray(data.posts) ? data.posts : [],
        total: typeof data.total === "number" ? data.total : 0,
        limit: typeof data.limit === "number" ? data.limit : 20,
        offset: typeof data.offset === "number" ? data.offset : 0,
        phase: data.phase,
      });
    } catch (err) {
      if (requestIdRef.current !== requestId) return;
      setError(err instanceof Error ? err.message : "Search failed");
      setResults(null);
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        class="rounded-lg p-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
        aria-label={t(currentLanguage, "actions.search")}
      >
        <SearchIcon className="h-5 w-5" />
      </button>

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={t(currentLanguage, "actions.search")}
        maxWidthClass="max-w-5xl"
      >
        <div class="flex flex-col gap-6">
          <SearchFilters
            initialFilters={initial}
            compact={false}
            autoApplySearch={true}
            defaultFiltersOpen={false}
            onSearch={(filters) => {
              runSearch(filters);
            }}
          />

          <div class="rounded-2xl border border-[var(--color-border)] bg-white p-4">
            <div class="flex items-center justify-between gap-3">
              <div class="text-sm font-semibold text-[var(--color-text-primary)]">
                {t(currentLanguage, "actions.search")}
              </div>
              {results ? (
                <div class="text-xs text-[var(--color-text-tertiary)]">
                  {results.total} result{results.total === 1 ? "" : "s"}
                  {results.phase ? ` • phase: ${results.phase}` : ""}
                </div>
              ) : null}
            </div>

            {loading ? (
              <div class="mt-4 text-sm text-[var(--color-text-secondary)]">
                Searching…
              </div>
            ) : error ? (
              <div class="mt-4 text-sm text-[var(--color-error)]">
                {error}
              </div>
            ) : !results ? (
              <div class="mt-4 text-sm text-[var(--color-text-secondary)]">
                Type a query (2+ characters) or adjust filters to search.
              </div>
            ) : results.posts.length === 0 ? (
              <div class="mt-4 text-sm text-[var(--color-text-secondary)]">
                No results.
              </div>
            ) : (
              <div class="mt-4 grid grid-cols-1 gap-3">
                {results.posts.map((post) => {
                  const href = `/${post.language}/posts/${post.slug}`;
                  const excerpt = stripMarkdown(post.body).slice(0, 140);
                  const date = formatDateShort(post.fecha);
                  return (
                    <a
                      key={post.id}
                      href={href}
                      class="rounded-xl border border-[var(--color-border)] bg-white p-4 hover:bg-[var(--color-bg-subtle)] transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <div class="font-semibold text-[var(--color-text-primary)]">
                          {post.titulo}
                        </div>
                        <div class="text-xs text-[var(--color-text-tertiary)]">
                          {date ? `${date} • ` : ""}{String(post.language).toUpperCase()}
                        </div>
                      </div>
                      {excerpt ? (
                        <div class="mt-2 text-sm text-[var(--color-text-secondary)]">
                          {excerpt}{stripHtml(post.body).length > 140 ? "…" : ""}
                        </div>
                      ) : null}
                    </a>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

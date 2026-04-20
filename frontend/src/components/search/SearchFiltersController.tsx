import SearchFilters from "./SearchFilters";
import { filtersToUrlParams } from "../../lib/search-filters";
import { getApiUrl } from "../../lib/env";
import { calculateReadTime, formatDate, stripMarkdown, truncateText } from "../../lib/utils";
import { t } from "../../lib/i18n";
import type { SearchFilters as SearchFiltersType } from "../../types/search";

interface Props {
  basePath: string; // e.g. "/en/" or "/en/tags/react"
  initialFilters: SearchFiltersType;
  showLanguageFilter?: boolean;
  showScopeFilter?: boolean;
  showTagFilter?: boolean;
  compact?: boolean;
  autoApplySearch?: boolean;
  defaultFiltersOpen?: boolean;
}

const API_URL = getApiUrl().replace(/\/$/, "");

const POSTS_ROOT_ID = "cwb-posts-root";
const POSTS_DEFAULT_ID = "cwb-posts-default";
const POSTS_SEARCH_ID = "cwb-posts-search";

function withPreservedPerPage(params: URLSearchParams) {
  if (typeof window === "undefined") return params;

  const current = new URLSearchParams(window.location.search);
  const perPage = current.get("per_page");
  if (perPage) params.set("per_page", perPage);
  return params;
}

function inferTagSlugFromBasePath(basePath: string): string | null {
  // basePath is expected to be something like:
  // - "/en/" (home)
  // - "/en/tags/react" (tag detail)
  const pathname = basePath.split("?")[0];
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 3 && parts[1] === "tags") return parts[2];
  return null;
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function setSearchMode(active: boolean) {
  const root = document.getElementById(POSTS_ROOT_ID);
  if (!root) return;
  const def = document.getElementById(POSTS_DEFAULT_ID);
  const search = document.getElementById(POSTS_SEARCH_ID);
  if (!def || !search) return;

  if (active) {
    def.classList.add("hidden");
    search.classList.remove("hidden");
  } else {
    search.classList.add("hidden");
    def.classList.remove("hidden");
    search.innerHTML = "";
  }
}

export default function SearchFiltersController({
  basePath,
  initialFilters,
  showLanguageFilter,
  showScopeFilter,
  showTagFilter,
  compact,
  autoApplySearch,
  defaultFiltersOpen,
}: Props) {
  return (
    <SearchFilters
      initialFilters={initialFilters}
      showLanguageFilter={showLanguageFilter}
      showScopeFilter={showScopeFilter}
      showTagFilter={showTagFilter}
      compact={compact}
      autoApplySearch={autoApplySearch}
      defaultFiltersOpen={defaultFiltersOpen}
      onSearch={async (filters) => {
        const uiParams = filtersToUrlParams(filters);
        const hasUiFilters = uiParams.toString().length > 0;

        const params = new URLSearchParams(uiParams.toString());
        withPreservedPerPage(params);

        // Reset pagination when applying a new search.
        params.delete("page");

        const qs = params.toString();
        const href = qs ? `${basePath}?${qs}` : basePath;

        // Update URL without navigation and notify other listeners
        if (typeof window !== "undefined") {
          try {
            history.pushState({}, "", href);
            window.dispatchEvent(new CustomEvent("cwb:search:applied", { detail: { href } }));

            if (!hasUiFilters) {
              // No active search filters: show the original server-rendered list
              // and keep a clean URL, without reloading.
              setSearchMode(false);
              return;
            }

            setSearchMode(true);

            // Fetch search results from API and update posts container.
            // Include explicit headers so reverse proxies/hosting prefer JSON responses
            // and avoid HTML redirects that some CDNs return for unknown API paths.
            const apiUrl = new URL(`${API_URL}/api/posts/search`);

            const term = filters.search.trim();
            if (term) apiUrl.searchParams.set("q", term);
            if (filters.from) apiUrl.searchParams.set("from", filters.from);
            if (filters.to) apiUrl.searchParams.set("to", filters.to);
            if (filters.relevance) apiUrl.searchParams.set("relevance", filters.relevance);
            if (filters.sort) apiUrl.searchParams.set("sort", filters.sort);
            if (filters.scope) apiUrl.searchParams.set("scope", filters.scope);
            if (filters.tags.length > 0) apiUrl.searchParams.set("tags", filters.tags.join(","));

            // If this controller is mounted on a tag detail route, keep the search scoped to that tag.
            const fixedTagSlug = inferTagSlugFromBasePath(basePath);
            if (fixedTagSlug) apiUrl.searchParams.set("tag_slug", fixedTagSlug);

            // Language filtering: if the language filter UI isn't shown (e.g. tag pages),
            // always scope to the current UI language.
            if (showLanguageFilter === false || filters.languageMode === "current") {
              apiUrl.searchParams.set("language", filters.uiLanguage);
            } else if (filters.languageMode === "selected" && filters.languages.length > 0) {
              apiUrl.searchParams.set("languages", filters.languages.join(","));
            } else {
              // all languages: omit language params.
            }

            // Match the server-side pagination size (per_page) when present; default to 10.
            const perPageRaw = params.get("per_page");
            const limit = Number.parseInt(perPageRaw ?? "10", 10);
            if (Number.isFinite(limit) && limit > 0) apiUrl.searchParams.set("limit", String(limit));
            apiUrl.searchParams.set("offset", "0");

            const headers = new Headers();
            headers.set("Accept", "application/json");
            headers.set("X-Requested-With", "XMLHttpRequest");

            const res = await fetch(apiUrl.toString(), { credentials: "same-origin", headers });
            if (!res.ok) {
              console.error("Search API error", res.status, apiUrl.toString());
              return;
            }
            const contentType = res.headers.get("content-type") ?? "";
            if (!contentType.includes("application/json")) {
              // If the server returned HTML (some hosts redirect unknown API paths to the 404 page)
              // don't attempt to parse it — just log and abort. Avoid falling back to legacy
              // /api/search which in some deployments is intercepted and redirects to HTML.
              console.error("Search API returned non-JSON response", contentType, apiUrl.toString());
              return;
            }
            let payload: any = null;
            try {
              payload = await res.json();
            } catch (err) {
              console.error("Failed to parse search JSON response", err);
              return;
            }
            const posts = payload?.data?.posts ?? payload?.posts ?? [];
            const total = payload?.data?.total ?? payload?.total ?? 0;
            const phase = payload?.data?.phase ?? payload?.phase ?? null;

            const searchRoot = document.getElementById(POSTS_SEARCH_ID);
            if (!searchRoot) return;

            const locale = filters.uiLanguage === "es" ? "es-ES" : "en-US";
            const readMoreLabel = t(filters.uiLanguage, "actions.readMore");

            // Render search results with the same structure/classes as PostCard.astro
            const itemsHtml = posts.map((p: any) => {
              const title = escapeHtml(p.titulo || "Untitled");
              const slug = escapeHtml(p.slug || "");
              const language = escapeHtml(p.language || filters.uiLanguage);
              const hrefPost = `/${language}/posts/${slug}`;

              const dateRaw = typeof p.fecha === "string" ? p.fecha : "";
              const dateLabel = dateRaw ? escapeHtml(formatDate(dateRaw, locale)) : "";
              const readTime = calculateReadTime(String(p.body ?? ""));
              const readTimeLabel = escapeHtml(t(filters.uiLanguage, "time.readTime", "common", { minutes: readTime }));

              const plain = stripMarkdown(String(p.excerpt ?? p.preview ?? p.body ?? ""));
              const excerpt = escapeHtml(truncateText(plain, 150));

              const imageUrl = typeof p.imagen_url === "string" ? p.imagen_url : "";
              const image = imageUrl
                ? `<div class="aspect-video overflow-hidden bg-[var(--color-bg-subtle)]">
                    <img
                      src="${escapeHtml(imageUrl)}"
                      alt="${title}"
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>`
                : "";
              return `
                <article class="bg-white rounded-xl border border-[var(--color-border)] overflow-hidden hover:shadow-lg hover:scale-[1.02] transition-all duration-300 flex flex-col h-full group relative z-1 isolate">
                  <a href="${hrefPost}" class="flex flex-col h-full text-inherit no-underline">
                    ${image}
                    <div class="p-6 flex flex-col flex-1">
                      <div class="flex items-center gap-4 text-sm text-[var(--color-text-tertiary)] mb-3">
                        ${dateLabel ? `<span class="flex items-center gap-1">${dateLabel}</span>` : ""}
                        <span class="flex items-center gap-1">${readTimeLabel}</span>
                      </div>

                      <h2 class="text-xl font-bold mb-3 line-clamp-2 group-hover:text-[var(--color-accent-primary)] transition-colors">
                        ${title}
                      </h2>

                      <p class="text-[var(--color-text-secondary)] mb-6 line-clamp-3 flex-1">
                        ${excerpt}
                      </p>

                      <div class="flex items-center text-[var(--color-accent-primary)] font-medium text-sm mt-auto group-hover:translate-x-1 transition-transform">
                        ${escapeHtml(readMoreLabel)}
                      </div>
                    </div>
                  </a>
                </article>
              `;
            }).join("");

            const countLine = escapeHtml(t(filters.uiLanguage, "search.resultsCount", "common", { count: total }));
            const noResults = escapeHtml(t(filters.uiLanguage, "search.noResults"));
            const phaseBanner = phase === "content"
              ? `<div class="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">${escapeHtml(t(filters.uiLanguage, "search.foundInContent"))}</div>`
              : phase === "tags"
                ? `<div class="mb-6 rounded-xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3 text-sm text-[var(--color-text-secondary)]">${escapeHtml(t(filters.uiLanguage, "search.foundInTags", "common", { term: filters.search.trim() }))}</div>`
                : "";

            searchRoot.innerHTML = `
              ${phaseBanner}
              ${total === 0
                ? `<div class="text-center py-20"><p class="text-xl text-[var(--color-text-secondary)]">${noResults}</p></div>`
                : `<div class="mb-6 text-sm text-[var(--color-text-tertiary)]">${countLine}</div>
                   <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">${itemsHtml}</div>`
              }
            `;
          } catch (err) {
            console.error("Search client error", err);
          }
        }
      }}
    />
  );
}

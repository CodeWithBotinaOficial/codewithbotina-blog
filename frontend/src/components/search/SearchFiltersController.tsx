import SearchFilters from "./SearchFilters";
import { filtersToUrlParams } from "../../lib/search-filters";
import { getApiUrl } from "../../lib/env";
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
        const params = filtersToUrlParams(filters);
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

            const root = document.getElementById("cwb-posts-root");
            if (!root) return;

            // Build simple HTML for results (keeps UI lightweight). Strip basic markdown from body.
            const itemsHtml = posts.map((p: any) => {
              const title = p.titulo || "Untitled";
              const excerpt = (p.body || "").replace(/\s+/g, " ").replace(/(!\[[^\]]*\]\([^)]*\))|\[([^\]]+)\]\([^)]*\)|[#*_`>~-]/g, "$2").trim();
              const image = p.imagen_url ? `<img src="${p.imagen_url}" alt="" class="w-full h-40 object-cover rounded-t-lg">` : "";
              return `
                <article class="rounded-lg border overflow-hidden bg-white">
                  <a href="/${p.language}/posts/${p.slug}" class="block">
                    ${image}
                    <div class="p-4">
                      <h3 class="font-semibold text-lg mb-2">${title}</h3>
                      <p class="text-sm text-[var(--color-text-secondary)]">${excerpt}</p>
                    </div>
                  </a>
                </article>
              `;
            }).join("");

            // Replace inner content with grid + simple pagination info
            root.innerHTML = `
              ${total === 0 ? `<div class="text-center py-20"><p class="text-xl text-[var(--color-text-secondary)]">No results</p></div>` : `<div class="mb-6 text-sm text-[var(--color-text-tertiary)]">${total} results</div>
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">${itemsHtml}</div>`}
            `;
          } catch (err) {
            console.error("Search client error", err);
          }
        }
      }}
    />
  );
}

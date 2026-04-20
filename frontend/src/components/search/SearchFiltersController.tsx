import SearchFilters from "./SearchFilters";
import { filtersToUrlParams } from "../../lib/search-filters";
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

function withPreservedPerPage(params: URLSearchParams) {
  if (typeof window === "undefined") return params;

  const current = new URLSearchParams(window.location.search);
  const perPage = current.get("per_page");
  if (perPage) params.set("per_page", perPage);
  return params;
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

            // Fetch search results from API and update posts container
            const apiUrl = new URL("/api/posts/search", window.location.origin);
            // Copy the same params used in the UI
            for (const [k, v] of params.entries()) apiUrl.searchParams.set(k, v);

            // Try primary endpoint then fall back to legacy /api/search if the
            // response is not JSON (some environments may route the paths
            // differently and return an HTML page).
            let res = await fetch(apiUrl.toString());
            if (!res.ok) {
              console.error("Search API error", res.status, apiUrl.toString());
              return;
            }
            let contentType = res.headers.get("content-type") ?? "";
            if (!contentType.includes("application/json")) {
              // Attempt compatibility path
              try {
                const fallbackUrl = new URL("/api/search", window.location.origin);
                for (const [k, v] of params.entries()) fallbackUrl.searchParams.set(k, v);
                const fallback = await fetch(fallbackUrl.toString());
                const fallbackCt = fallback.headers.get("content-type") ?? "";
                if (fallback.ok && fallbackCt.includes("application/json")) {
                  res = fallback;
                  contentType = fallbackCt;
                } else {
                  console.error("Search API returned non-JSON response", contentType, "attempted fallback:", fallbackCt);
                  return;
                }
              } catch (err) {
                console.error("Search API fetch/fallback error", err);
                return;
              }
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

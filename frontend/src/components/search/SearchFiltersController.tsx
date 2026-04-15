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
}: Props) {
  return (
    <SearchFilters
      initialFilters={initialFilters}
      showLanguageFilter={showLanguageFilter}
      showScopeFilter={showScopeFilter}
      showTagFilter={showTagFilter}
      compact={compact}
      autoApplySearch={autoApplySearch}
      onSearch={(filters) => {
        const params = filtersToUrlParams(filters);
        withPreservedPerPage(params);

        // Reset pagination when applying a new search.
        params.delete("page");

        const qs = params.toString();
        const href = qs ? `${basePath}?${qs}` : basePath;
        window.location.assign(href);
      }}
    />
  );
}

import type { SupportedLanguage } from "../lib/i18n";

export type SearchRelevance =
  | "most_recent"
  | "most_reactions"
  | "most_likes"
  | "most_dislikes"
  | "most_comments";

export type SearchScope = "title" | "content" | "title_content" | "tags";

export type SearchSortOrder = "newest" | "oldest" | "az" | "za";

export type LanguageMode = "current" | "all" | "selected";

export interface SearchFilters {
  uiLanguage: SupportedLanguage;
  search: string;
  from: string; // YYYY-MM-DD or ""
  to: string; // YYYY-MM-DD or ""
  relevance: SearchRelevance;
  sort: SearchSortOrder;
  scope: SearchScope;
  languageMode: LanguageMode;
  languages: SupportedLanguage[]; // used when languageMode === "selected"
  tags: string[]; // tag slugs
}

export const DEFAULT_SEARCH_FILTERS = (uiLanguage: SupportedLanguage): SearchFilters => ({
  uiLanguage,
  search: "",
  from: "",
  to: "",
  relevance: "most_recent",
  sort: "newest",
  scope: "title",
  languageMode: "current",
  languages: [],
  tags: [],
});


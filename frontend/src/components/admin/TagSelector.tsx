import { useEffect, useMemo, useState } from "preact/hooks";
import { getApiUrl } from "../../lib/env";
import { getAdminRoute } from "../../lib/admin-endpoints";
import type { TagSelectorLabels } from "../../lib/admin-editor";

export interface TagOption {
  id: string;
  name: string;
  slug: string;
  usage_count?: number;
}

interface Props {
  title: string;
  body: string;
  selectedTags: TagOption[];
  onChange: (_tags: TagOption[]) => void;
  labels?: TagSelectorLabels;
}

const API_URL = getApiUrl();
const ADMIN_API = getAdminRoute("");

export default function TagSelector({ title, body, selectedTags, onChange, labels }: Props) {
  const copy: TagSelectorLabels = labels ?? {
    title: "Tags (SEO)",
    emptyHint: "Add 3-7 tags to improve search visibility.",
    inputPlaceholder: "Search or create a tag",
    noResults: "No tags found.",
    createLabel: "Create \"{{tag}}\"",
    suggestionsTitle: "Suggested tags",
    loadingSuggestions: "Loading suggestions...",
    suggestionsError: "Unable to load tag suggestions.",
    postsCount: "{{count}} posts",
    removeLabel: "Remove {{tag}}",
  };

  const formatTemplate = (template: string, data: Record<string, string | number>) => {
    return Object.entries(data).reduce((acc, [key, value]) => {
      return acc.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), String(value));
    }, template);
  };
  const [suggestions, setSuggestions] = useState<TagOption[]>([]);
  const [autocomplete, setAutocomplete] = useState<TagOption[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const selectedIds = useMemo(() => new Set(selectedTags.map((tag) => tag.id)), [selectedTags]);
  const trimmedInput = inputValue.trim();
  const canShowDropdown = trimmedInput.length >= 2;
  const hasExactMatch = autocomplete.some(
    (tag) => tag.name.toLowerCase() === trimmedInput.toLowerCase(),
  );
  const alreadySelected = selectedTags.some(
    (tag) => tag.name.toLowerCase() === trimmedInput.toLowerCase(),
  );
  const showCreate = canShowDropdown && !hasExactMatch && !alreadySelected;
  const shouldRenderDropdown = canShowDropdown && (autocomplete.length > 0 || showCreate);
  const inputId = "post-tags";

  useEffect(() => {
    if (title.trim().length < 10 || body.trim().length < 50) {
      setSuggestions([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoadingSuggestions(true);
      setErrorMessage(null);
      try {
        const response = await fetch(`${API_URL}/api/tags/suggest`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title, body }),
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to load tag suggestions");
        }

        const payload = await response.json();
        const list = payload?.data?.suggestions || payload?.suggestions || [];
        setSuggestions(list);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setErrorMessage(copy.suggestionsError);
        }
      } finally {
        setLoadingSuggestions(false);
      }
    }, 800);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [title, body]);

  useEffect(() => {
    if (inputValue.trim().length < 2) {
      setAutocomplete([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/tags/autocomplete?q=${encodeURIComponent(inputValue.trim())}`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error("Failed to autocomplete tags");
        }
        const payload = await response.json();
        const list = payload?.data?.tags || payload?.tags || [];
        setAutocomplete(list);
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          setAutocomplete([]);
        }
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [inputValue]);

  const addTag = (tag: TagOption) => {
    if (selectedIds.has(tag.id)) return;
    onChange([...selectedTags, tag]);
    setInputValue("");
    setAutocomplete([]);
  };

  const removeTag = (tagId: string) => {
    onChange(selectedTags.filter((tag) => tag.id !== tagId));
  };

  const createNewTag = async () => {
    const name = trimmedInput;
    if (name.length < 2) return;

    try {
      const response = await fetch(`${ADMIN_API}/tags/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ name }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || payload?.message || "Failed to create tag");
      }

      const created = payload?.data?.tag || payload?.tag;
      if (created) {
        addTag(created);
      }
    } catch (error) {
      setErrorMessage((error as Error).message || "Unable to create tag");
    }
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    if (autocomplete.length > 0) {
      addTag(autocomplete[0]);
    } else {
      createNewTag();
    }
  };

  return (
    <div class="space-y-3">
      <label class="text-sm font-semibold" htmlFor={inputId}>{copy.title}</label>

      <div class="flex flex-wrap gap-2">
        {selectedTags.length === 0 ? (
          <span class="text-xs text-[var(--color-text-tertiary)]">{copy.emptyHint}</span>
        ) : null}
        {selectedTags.map((tag) => (
          <span
            key={tag.id}
            class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--color-accent-light)] text-[var(--color-accent-primary)] text-xs font-semibold"
          >
            {tag.name}
            <button
              type="button"
              onClick={() => removeTag(tag.id)}
              class="text-[var(--color-accent-primary)] hover:text-[var(--color-accent-hover)]"
              aria-label={formatTemplate(copy.removeLabel, { tag: tag.name })}
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div class="relative">
        <input
          type="text"
          id={inputId}
          name="tags"
          value={inputValue}
          onInput={(event) => setInputValue((event.currentTarget as HTMLInputElement).value)}
          onKeyDown={handleKeyDown}
          placeholder={copy.inputPlaceholder}
          class="input-field"
        />

        {shouldRenderDropdown && (
          <div class="absolute z-20 w-full mt-2 bg-white border border-[var(--color-border)] rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {autocomplete.length > 0 ? (
              autocomplete.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => addTag(tag)}
                  class="w-full px-4 py-2 text-left hover:bg-[var(--color-bg-subtle)] flex items-center justify-between"
                >
                  <span>{tag.name}</span>
                  <span class="text-xs text-[var(--color-text-tertiary)]">
                    {formatTemplate(copy.postsCount, { count: tag.usage_count ?? 0 })}
                  </span>
                </button>
              ))
            ) : (
              <div class="px-4 py-2 text-xs text-[var(--color-text-tertiary)]">
                {copy.noResults}
              </div>
            )}
            {showCreate ? (
              <button
                type="button"
                onClick={createNewTag}
                class="w-full px-4 py-2 text-left border-t border-[var(--color-border)] text-[var(--color-accent-primary)] hover:bg-[var(--color-bg-subtle)]"
              >
                {formatTemplate(copy.createLabel, { tag: trimmedInput })}
              </button>
            ) : null}
          </div>
        )}
      </div>

      {loadingSuggestions ? (
        <p class="text-xs text-[var(--color-text-tertiary)]">{copy.loadingSuggestions}</p>
      ) : null}

      {errorMessage ? (
        <p class="text-xs text-[var(--color-error)]">{errorMessage}</p>
      ) : null}

      {suggestions.length > 0 && (
        <div class="space-y-2">
          <p class="text-xs text-[var(--color-text-tertiary)]">{copy.suggestionsTitle}</p>
          <div class="flex flex-wrap gap-2">
            {suggestions.map((tag) => {
              const selected = selectedIds.has(tag.id);
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => addTag(tag)}
                  disabled={selected}
                  class={
                    selected
                      ? "px-3 py-1 rounded-full text-xs border border-[var(--color-border)] text-[var(--color-text-tertiary)]"
                      : "px-3 py-1 rounded-full text-xs border border-[var(--color-border)] hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)]"
                  }
                >
                  {tag.name}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

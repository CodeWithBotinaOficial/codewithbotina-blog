import { Globe } from "lucide-preact";
import { useEffect, useState } from "preact/hooks";
import { getApiUrl } from "../lib/env";
import { getLocalizedPath, LANGUAGE_NAMES, SUPPORTED_LANGUAGES } from "../lib/i18n";
import type { SupportedLanguage } from "../lib/i18n";

interface Props {
  currentLanguage: SupportedLanguage;
  currentPath: string;
  currentPostId?: string;
}

const API_URL = getApiUrl().replace(/\/$/, "");

export default function LanguageSwitcher({ currentLanguage, currentPath, currentPostId }: Props) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = () => setIsOpen(false);
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [isOpen]);

  const switchLanguage = async (newLang: SupportedLanguage) => {
    document.cookie = `preferred_language=${newLang}; path=/; max-age=31536000; SameSite=Lax; Secure`;

    // On post pages, attempt to resolve an equivalent post before redirecting.
    if (currentPostId && currentPath.includes("/posts/")) {
      try {
        const res = await fetch(
          `${API_URL}/api/posts/${encodeURIComponent(currentPostId)}/translation/${encodeURIComponent(newLang)}`,
        );
        if (res.ok) {
          const payload = await res.json();
          const data = payload?.data ?? payload;
          const translatedSlug = data?.slug as string | undefined;
          if (translatedSlug) {
            window.location.href = `/${newLang}/posts/${translatedSlug}`;
            return;
          }
        }
        if (res.status === 404) {
          const origin = window.location.pathname;
          window.location.href =
            `/${newLang}/404?missing_translation=true&origin=${encodeURIComponent(origin)}&origin_lang=${encodeURIComponent(currentLanguage)}&target_lang=${encodeURIComponent(newLang)}`;
          return;
        }
      } catch (_err) {
        // Fall back to localized path below.
      }
    }

    window.location.href = `${getLocalizedPath(currentPath, newLang)}${window.location.search || ""}`;
  };

  return (
    <div class="relative">
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((prev) => !prev);
        }}
        class="flex items-center gap-2 rounded-lg px-3 py-2 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-subtle)]"
        aria-label="Switch language"
      >
        <Globe className="h-5 w-5" />
        <span class="hidden sm:inline">{LANGUAGE_NAMES[currentLanguage]}</span>
        <span class="sm:hidden">{currentLanguage.toUpperCase()}</span>
      </button>

      {isOpen ? (
        <div class="absolute right-0 mt-2 w-40 rounded-lg border border-[var(--color-border)] bg-white py-1 shadow-lg z-50">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => switchLanguage(lang)}
              class={`flex w-full items-center justify-between px-4 py-2 text-left text-sm hover:bg-[var(--color-bg-subtle)] ${
                lang === currentLanguage ? "bg-[var(--color-accent-light)] text-[var(--color-accent-primary)]" : "text-[var(--color-text-secondary)]"
              }`}
            >
              <span>{LANGUAGE_NAMES[lang]}</span>
              {lang === currentLanguage ? <span aria-hidden="true">✓</span> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

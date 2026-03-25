import { useEffect, useState } from "preact/hooks";
import { ChevronLeft, ChevronRight } from "lucide-preact";
import {
  ALLOWED_PER_PAGE,
  DEFAULT_PER_PAGE,
  buildPageHref,
  generatePageItems,
  parsePage,
  parsePerPage,
  type AllowedPerPage,
} from "../../lib/pagination";

interface Labels {
  previous: string;
  next: string;
  page: string;
  of: string;
  postsPerPage: string;
  show: string;
  goToPage: string; // expects {{page}}
  currentPage: string; // expects {{page}}
}

interface Props {
  currentPage: number;
  totalPages: number;
  perPage: AllowedPerPage;
  baseUrl: string; // e.g. "/en/" or "/en/tags/react"
  labels: Labels;
}

function formatTemplate(template: string, data: Record<string, string | number>) {
  return Object.entries(data).reduce((acc, [key, value]) => {
    return acc.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), String(value));
  }, template);
}

export default function PaginationControls({
  currentPage,
  totalPages,
  perPage,
  baseUrl,
  labels,
}: Props) {
  const [isNavigating, setIsNavigating] = useState(false);
  const [selectedPerPage, setSelectedPerPage] = useState<AllowedPerPage>(perPage);

  const hasPrev = currentPage > 1;
  const hasNext = currentPage < totalPages;

  const hrefFor = (page: number, nextPerPage: number) => {
    return buildPageHref(baseUrl, page, nextPerPage);
  };

  const navigate = (href: string) => {
    if (isNavigating) return;
    setIsNavigating(true);
    window.location.assign(href);
  };

  useEffect(() => {
    // Sync preference from URL or localStorage.
    const params = new URLSearchParams(window.location.search);
    const urlPerPage = parsePerPage(params.get("per_page"));
    const storedRaw = window.localStorage.getItem("posts_per_page");
    const stored = parsePerPage(storedRaw);

    if (urlPerPage) {
      window.localStorage.setItem("posts_per_page", String(urlPerPage));
      setSelectedPerPage(urlPerPage);
      return;
    }

    if (stored && stored !== perPage) {
      const pageFromUrl = parsePage(params.get("page")) ?? 1;
      const target = hrefFor(Math.max(1, pageFromUrl), stored);
      // Avoid infinite loop if the URL already matches.
      if (target !== `${window.location.pathname}${window.location.search}`) {
        navigate(target);
      }
    }
  }, []);

  useEffect(() => {
    setSelectedPerPage(perPage);
  }, [perPage]);

  const pageItems = generatePageItems(currentPage, totalPages);

  return (
    <div class="mt-12 flex flex-col gap-4 border-t border-[var(--color-border)] pt-8">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <nav
          class="flex items-center justify-center sm:justify-start gap-2 flex-wrap"
          aria-label="Pagination"
        >
          <button
            type="button"
            class={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              hasPrev && !isNavigating
                ? "border-[var(--color-border)] bg-white text-[var(--color-text-primary)] hover:border-[var(--color-accent-primary)]/40 hover:bg-[var(--color-bg-subtle)]"
                : "border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] cursor-not-allowed"
            }`}
            onClick={() => {
              if (!hasPrev) return;
              navigate(hrefFor(currentPage - 1, selectedPerPage));
            }}
            disabled={!hasPrev || isNavigating}
            aria-label={labels.previous}
          >
            <ChevronLeft className="h-4 w-4" />
            <span class="hidden sm:inline">{labels.previous}</span>
          </button>

          <div class="hidden md:flex items-center gap-1">
            {pageItems.map((item, idx) => {
              if (item === "ellipsis") {
                return (
                  <span
                    key={`e-${idx}`}
                    class="px-2 text-sm text-[var(--color-text-tertiary)]"
                    aria-hidden="true"
                  >
                    ...
                  </span>
                );
              }

              const isCurrent = item === currentPage;
              return (
                <button
                  key={item}
                  type="button"
                  class={`min-w-[40px] h-10 rounded-lg border px-3 text-sm font-semibold transition ${
                    isCurrent
                      ? "border-[var(--color-accent-primary)] bg-[var(--color-accent-primary)] text-white"
                      : "border-[var(--color-border)] bg-white text-[var(--color-text-primary)] hover:border-[var(--color-accent-primary)]/40 hover:bg-[var(--color-bg-subtle)]"
                  }`}
                  aria-current={isCurrent ? "page" : undefined}
                  aria-label={isCurrent
                    ? formatTemplate(labels.currentPage, { page: item })
                    : formatTemplate(labels.goToPage, { page: item })}
                  onClick={() => {
                    if (isCurrent) return;
                    navigate(hrefFor(item, selectedPerPage));
                  }}
                  disabled={isNavigating}
                >
                  {item}
                </button>
              );
            })}
          </div>

          <div class="md:hidden px-2 text-sm font-semibold text-[var(--color-text-secondary)]">
            {labels.page} {currentPage} {labels.of} {totalPages}
          </div>

          <button
            type="button"
            class={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
              hasNext && !isNavigating
                ? "border-[var(--color-border)] bg-white text-[var(--color-text-primary)] hover:border-[var(--color-accent-primary)]/40 hover:bg-[var(--color-bg-subtle)]"
                : "border-[var(--color-border)] bg-[var(--color-bg-subtle)] text-[var(--color-text-tertiary)] cursor-not-allowed"
            }`}
            onClick={() => {
              if (!hasNext) return;
              navigate(hrefFor(currentPage + 1, selectedPerPage));
            }}
            disabled={!hasNext || isNavigating}
            aria-label={labels.next}
          >
            <span class="hidden sm:inline">{labels.next}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </nav>

        <div class="flex items-center justify-center sm:justify-end gap-2">
          <span class="hidden sm:inline text-sm font-semibold text-[var(--color-text-secondary)]">
            {labels.postsPerPage}
          </span>
          <span class="sm:hidden text-sm font-semibold text-[var(--color-text-secondary)]">
            {labels.show}
          </span>
          <select
            class="rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm font-semibold text-[var(--color-text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-accent-primary)]"
            value={String(selectedPerPage)}
            onChange={(event) => {
              const next = Number((event.target as HTMLSelectElement).value);
              const allowed = (ALLOWED_PER_PAGE as readonly number[]).includes(next);
              const nextPerPage = (allowed ? next : DEFAULT_PER_PAGE) as AllowedPerPage;
              setSelectedPerPage(nextPerPage);

              window.localStorage.setItem("posts_per_page", String(nextPerPage));

              // Reset to page 1 when changing density.
              const href = nextPerPage === DEFAULT_PER_PAGE
                ? hrefFor(1, DEFAULT_PER_PAGE)
                : hrefFor(1, nextPerPage);
              navigate(href);
            }}
            disabled={isNavigating}
            aria-label={labels.postsPerPage}
          >
            {ALLOWED_PER_PAGE.map((value) => (
              <option key={value} value={String(value)}>
                {value}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}


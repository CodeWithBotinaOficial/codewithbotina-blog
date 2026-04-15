import { useEffect, useMemo, useState } from "preact/hooks";
import { Search as SearchIcon } from "lucide-preact";
import Modal from "../ui/Modal";
import SearchFiltersController from "./SearchFiltersController";
import { DEFAULT_SEARCH_FILTERS } from "../../types/search";
import type { SupportedLanguage } from "../../lib/i18n";
import { t } from "../../lib/i18n";

interface Props {
  currentLanguage: SupportedLanguage;
}

export default function GlobalSearchModal({ currentLanguage }: Props) {
  const [open, setOpen] = useState(false);
  const initial = useMemo(() => DEFAULT_SEARCH_FILTERS(currentLanguage), [currentLanguage]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

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
        <SearchFiltersController
          basePath={`/${currentLanguage}/`}
          initialFilters={initial}
          compact={false}
          autoApplySearch={false}
        />
      </Modal>
    </>
  );
}

import type { ComponentChildren } from "preact";
import { createPortal } from "preact/compat";
import { useLayoutEffect } from "preact/hooks";
import { X } from "lucide-preact";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ComponentChildren;
  footer?: ComponentChildren;
  maxWidthClass?: string;
}

export default function Modal({ isOpen, onClose, title, children, footer, maxWidthClass = "max-w-lg" }: ModalProps) {
  useLayoutEffect(() => {
    if (typeof document === "undefined") return;
    document.body.style.overflow = isOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen) return null;
  if (typeof document === "undefined") return null;

  // Render into document.body to avoid being clipped by ancestors (e.g. a header with backdrop-filter).
  return createPortal((
    <div
      class="fixed inset-0 z-[100] bg-black/50 p-4 overflow-y-auto"
      onClick={onClose}
      data-modal-backdrop
    >
      <div class="min-h-full flex items-center justify-center">
        <div
          class={`w-full ${maxWidthClass} max-h-[calc(100vh-2rem)] flex flex-col overflow-hidden rounded-xl bg-white shadow-xl`}
          onClick={(event) => event.stopPropagation()}
          role="dialog"
          aria-modal="true"
        >
          <div class="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-4 shrink-0">
            <h2 class="text-lg font-semibold text-[var(--color-text-primary)]">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              class="rounded-full p-2 text-[var(--color-text-tertiary)] hover:bg-[var(--color-bg-subtle)]"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div class="px-5 py-4 text-sm text-[var(--color-text-secondary)] flex-1 overflow-y-auto">
            {children}
          </div>
          {footer ? (
            <div class="flex flex-wrap justify-end gap-3 border-t border-[var(--color-border)] px-5 py-4 shrink-0">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  ), document.body);
}

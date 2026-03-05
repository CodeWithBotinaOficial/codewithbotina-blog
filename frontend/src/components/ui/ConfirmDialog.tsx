import type { ComponentChildren } from "preact";
import { AlertTriangle } from "lucide-preact";
import Modal from "./Modal";

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "info";
  children?: ComponentChildren;
}

const variantStyles: Record<NonNullable<ConfirmDialogProps["variant"]>, string> = {
  danger: "bg-[var(--color-error)] hover:bg-[#b71c1c]",
  warning: "bg-[var(--color-warning)] hover:bg-[#d97706]",
  info: "bg-[var(--color-info)] hover:bg-[#155a8a]",
};

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "info",
  children,
}: ConfirmDialogProps) {
  const showIcon = variant !== "info";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button
            type="button"
            class="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-text-primary)]"
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button
            type="button"
            class={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${variantStyles[variant]}`}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmText}
          </button>
        </>
      }
    >
      <div class="space-y-3">
        <div class="flex items-start gap-3">
          {showIcon ? (
            <AlertTriangle
              className={`h-5 w-5 ${variant === "danger" ? "text-[var(--color-error)]" : "text-[var(--color-warning)]"}`}
            />
          ) : null}
          <p class="text-sm text-[var(--color-text-secondary)]">{message}</p>
        </div>
        {children ? <div class="text-sm text-[var(--color-text-secondary)]">{children}</div> : null}
      </div>
    </Modal>
  );
}

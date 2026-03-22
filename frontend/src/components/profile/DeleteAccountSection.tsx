import { useEffect, useRef, useState } from "preact/hooks";
import { AlertTriangle, Trash2 } from "lucide-preact";
import { getApiUrl } from "../../lib/env";
import { setAuthState } from "../../lib/auth-state";
import Modal from "../ui/Modal";
import Toast from "../ui/Toast";
import { useToast } from "../../hooks/useToast";

interface Props {
  language: "en" | "es";
  labels: {
    dangerZone: string;
    deleteWarning: string;
    deleteAccount: string;
    modalTitle: string;
    warning: string;
    deletedItems: {
      profile: string;
      comments: string;
      reactions: string;
      sessions: string;
      tokens: string;
    };
    additionalWarning: string;
    confirmationPrompt: string;
    confirmationPlaceholder: string;
    confirmationWord: string;
    cancel: string;
    confirmDelete: string;
    processing: string;
    success: string;
    error: string;
  };
}

const API_URL = getApiUrl().replace(/\/$/, "");

export default function DeleteAccountSection({ language, labels }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { toasts, showToast, removeToast } = useToast();

  const normalized = confirmText.trim().toLowerCase();
  const isConfirmed = normalized === labels.confirmationWord.toLowerCase();

  useEffect(() => {
    if (!isOpen) return;
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setIsOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen]);

  const resetModal = () => {
    setConfirmText("");
    setError("");
    setIsDeleting(false);
  };

  const closeModal = () => {
    setIsOpen(false);
    window.setTimeout(resetModal, 0);
  };

  const deleteAccount = async () => {
    if (!isConfirmed || isDeleting) return;
    setIsDeleting(true);
    setError("");

    try {
      const res = await fetch(`${API_URL}/api/users/delete-account`, {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setError(body?.error || labels.error);
        setIsDeleting(false);
        return;
      }

      // Ensure client-side auth state flips immediately.
      setAuthState(false);
      window.dispatchEvent(new Event("cwb:auth-changed"));
      try {
        window.localStorage.removeItem("CodeWithBotinaAuth");
      } catch (_err) {
        // Ignore storage errors.
      }

      showToast(labels.success, "success");
      closeModal();

      window.setTimeout(() => {
        window.location.assign(`/${language}/?accountDeleted=1`);
      }, 450);
    } catch (_err) {
      setError(labels.error);
      setIsDeleting(false);
    }
  };

  return (
    <section class="mt-14 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg-subtle)] p-6">
      <div class="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-[var(--color-error)] mt-0.5" />
        <div class="flex-1">
          <h2 class="text-lg font-bold text-[var(--color-text-primary)]">
            {labels.dangerZone}
          </h2>
          <p class="mt-1 text-sm text-[var(--color-text-secondary)]">
            {labels.deleteWarning}
          </p>
        </div>
      </div>

      <div class="mt-5">
        <button
          type="button"
          class="inline-flex items-center gap-2 rounded-lg border border-[var(--color-error)]/35 bg-white px-4 py-2 text-sm font-semibold text-[var(--color-error)] hover:border-[var(--color-error)]/60 hover:bg-red-50 transition-colors"
          onClick={() => setIsOpen(true)}
          aria-label={labels.deleteAccount}
        >
          <Trash2 className="h-4 w-4" />
          {labels.deleteAccount}
        </button>
      </div>

      <Modal
        isOpen={isOpen}
        onClose={closeModal}
        title={labels.modalTitle}
        footer={
          <>
            <button
              type="button"
              class="rounded-lg border border-[var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-text-primary)]"
              onClick={closeModal}
              disabled={isDeleting}
            >
              {labels.cancel}
            </button>
            <button
              type="button"
              class={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${
                isConfirmed && !isDeleting
                  ? "bg-[var(--color-error)] hover:bg-[#b71c1c]"
                  : "bg-[var(--color-error)]/50 cursor-not-allowed"
              }`}
              onClick={deleteAccount}
              disabled={!isConfirmed || isDeleting}
            >
              {isDeleting ? labels.processing : labels.confirmDelete}
            </button>
          </>
        }
      >
        <div class="space-y-4">
          <p class="text-sm text-[var(--color-text-secondary)]">
            {labels.warning}
          </p>

          <ul class="list-disc pl-5 text-sm text-[var(--color-text-secondary)]">
            <li>{labels.deletedItems.profile}</li>
            <li>{labels.deletedItems.comments}</li>
            <li>{labels.deletedItems.reactions}</li>
            <li>{labels.deletedItems.sessions}</li>
            <li>{labels.deletedItems.tokens}</li>
          </ul>

          <p class="text-sm text-[var(--color-text-secondary)]">
            {labels.additionalWarning}
          </p>

          <div class="space-y-2">
            <label class="block text-sm font-semibold text-[var(--color-text-primary)]">
              {labels.confirmationPrompt}
            </label>
            <input
              ref={inputRef}
              class="input-field"
              value={confirmText}
              onInput={(event) =>
                setConfirmText((event.target as HTMLInputElement).value)}
              placeholder={labels.confirmationPlaceholder}
              aria-label={labels.confirmationPrompt}
              disabled={isDeleting}
              autocomplete="off"
              spellcheck={false}
            />
            {error ? (
              <p class="text-sm text-[var(--color-error)]">{error}</p>
            ) : null}
          </div>
        </div>
      </Modal>

      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </section>
  );
}


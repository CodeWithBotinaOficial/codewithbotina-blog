import { useEffect, useState } from "preact/hooks";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-preact";

export type ToastType = "success" | "error" | "info";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  duration?: number;
}

const icons = {
  success: <CheckCircle2 className="h-5 w-5 text-[var(--color-success)]" />,
  error: <AlertCircle className="h-5 w-5 text-[var(--color-error)]" />,
  info: <Info className="h-5 w-5 text-[var(--color-info)]" />,
};

const styles = {
  success: "border-[var(--color-success)]/30 bg-green-50",
  error: "border-[var(--color-error)]/30 bg-red-50",
  info: "border-[var(--color-info)]/30 bg-blue-50",
};

export default function Toast({ message, type, onClose, duration = 5000 }: ToastProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsVisible(false);
      window.setTimeout(onClose, 250);
    }, duration);

    return () => window.clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      class={`fixed right-4 top-4 z-50 transition-all duration-300 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
      role="status"
      aria-live="polite"
    >
      <div class={`flex min-w-[280px] max-w-sm items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${styles[type]}`}>
        {icons[type]}
        <p class="flex-1 text-sm text-[var(--color-text-primary)]">{message}</p>
        <button
          type="button"
          class="rounded p-1 text-[var(--color-text-tertiary)] hover:bg-white/60"
          onClick={() => {
            setIsVisible(false);
            window.setTimeout(onClose, 250);
          }}
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

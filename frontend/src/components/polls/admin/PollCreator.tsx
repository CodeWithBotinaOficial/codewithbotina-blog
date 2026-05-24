import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Plus, Trash2, X } from "lucide-preact";
import { useToast } from "../../../hooks/useToast";
import { getApiUrl } from "../../../lib/env";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  onPollCreated?: (_poll: any) => void;
}

export default function PollCreator({ isOpen, onClose, language, onPollCreated }: Props) {
  const API_URL = useMemo(() => getApiUrl().replace(/\/$/, ""), []);
  const [type, setType] = useState("single_choice");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [closesAt, setClosesAt] = useState<string>("");
  const [options, setOptions] = useState<Array<{ text: string }>>([{ text: "" }, { text: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { showToast } = useToast();
  const containerRef = useRef<HTMLDivElement | null>(null);

  const maxOptions = type === "single_choice" ? 5 : 9;
  const minOptions = 2;

  useEffect(() => {
    if (!isOpen) return;
    // Reset modal state when opened.
    setSubmitting(false);
    setError(null);
    setType("single_choice");
    setTitle("");
    setDescription("");
    setClosesAt("");
    setOptions([{ text: "" }, { text: "" }]);

    // Focus the first input for faster authoring.
    window.setTimeout(() => {
      const el = containerRef.current?.querySelector<HTMLInputElement>('input[name="poll-title"]');
      el?.focus();
    }, 0);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const addOption = () => {
    setOptions((prev) => (prev.length >= maxOptions ? prev : [...prev, { text: "" }]));
  };

  const removeOption = (index: number) => {
    setOptions((prev) => prev.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, text: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, text } : o)));
  };

  async function handleCreatePoll(e?: Event) {
    e?.preventDefault?.();
    if (!title.trim()) {
      setError("Title is required");
      showToast("Title is required", "error");
      return;
    }

    if (type !== "free_text") {
      const validOptions = options.map((o) => String(o.text ?? "").trim()).filter(Boolean);
      if (validOptions.length < minOptions) {
        setError(`At least ${minOptions} options required`);
        showToast(`At least ${minOptions} options required`, "error");
        return;
      }
    }

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`${API_URL}/api/polls/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          slug,
          title,
          description,
          type,
          language,
          closes_at: closesAt ? new Date(closesAt).toISOString() : null,
          options: type === "free_text"
            ? []
            : options
              .map((o) => ({ text: String(o.text ?? "").trim() }))
              .filter((o) => o.text),
        }),
      });

      if (res.ok) {
        const poll = await res.json();
        showToast("Poll created!", "success");
        onPollCreated?.(poll.data ?? poll);
        onClose();
      } else {
        const err = await res.json();
        const message = err?.message || err?.error || `HTTP ${res.status}`;
        setError(String(message));
        showToast(String(message), "error");
      }
    } catch (_err) {
      setError("Failed to create poll");
      showToast("Failed to create poll", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="poll-creator-modal"
      role="dialog"
      aria-modal="true"
      aria-label="Create Poll"
      onClick={() => onClose()}
    >
      <div className="poll-creator-container" ref={containerRef} onClick={(e) => e.stopPropagation()}>
        <div className="poll-creator-header">
          <h3>Create Poll</h3>
          <button type="button" className="btn-secondary" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="poll-creator-body">
          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-semibold">Type</label>
            <select
              className="input-field"
              value={type}
              onChange={(e: any) => setType(String(e.currentTarget.value))}
              disabled={submitting}
            >
              <option value="free_text">Free Text</option>
              <option value="single_choice">Single Choice</option>
              <option value="multiple_choice">Multiple Choice</option>
            </select>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-semibold">Title</label>
            <input
              name="poll-title"
              className="input-field"
              value={title}
              onInput={(e: any) => setTitle(String(e.currentTarget.value))}
              disabled={submitting}
            />
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-semibold">Description</label>
            <textarea
              className="input-field"
              value={description}
              onInput={(e: any) => setDescription(String(e.currentTarget.value))}
              rows={3}
              disabled={submitting}
            />
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-semibold">Closes At (optional)</label>
            <input
              className="input-field"
              type="datetime-local"
              value={closesAt}
              onInput={(e: any) => setClosesAt(String(e.currentTarget.value))}
              disabled={submitting}
            />
          </div>

          {type !== "free_text" ? (
            <div className="mt-5 space-y-2">
              <label className="text-sm font-semibold">Options ({minOptions}-{maxOptions})</label>
              <div className="poll-options-list">
                {options.map((opt, i) => (
                  <div key={i} className="poll-option-row">
                    <input
                      className="input-field"
                      value={opt.text}
                      placeholder={`Option ${i + 1}`}
                      onInput={(e: any) => updateOption(i, String(e.currentTarget.value))}
                      disabled={submitting}
                    />
                    {options.length > minOptions ? (
                      <button
                        type="button"
                        className="btn-icon-danger"
                        onClick={() => removeOption(i)}
                        title="Remove option"
                        disabled={submitting}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>

              <button type="button" className="btn-secondary btn-sm inline-flex items-center gap-2" onClick={addOption} disabled={submitting || options.length >= maxOptions}>
                <Plus className="h-4 w-4" />
                Add Option
              </button>
            </div>
          ) : null}
        </div>

        <div className="poll-creator-footer">
          <button type="button" className="btn-secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button type="button" className="btn-primary" onClick={(e) => handleCreatePoll(e as any)} disabled={submitting || !title.trim()}>
            {submitting ? "Creating..." : "Create Poll"}
          </button>
        </div>
      </div>
    </div>
  );
}

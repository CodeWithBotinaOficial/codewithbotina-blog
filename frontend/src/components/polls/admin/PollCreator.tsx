import { useEffect, useRef, useState } from "preact/hooks";
import { Plus, Trash2, X } from "lucide-preact";
import { useToast } from "../../../hooks/useToast";
import { pollsApi } from "../../../lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  onPollCreated?: (_poll: any) => void;
}

export default function PollCreator({ isOpen, onClose, language, onPollCreated }: Props) {
  const [type, setType] = useState("single_choice");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [closesAt, setClosesAt] = useState<string>("");
  const [options, setOptions] = useState<Array<{ text: string }>>([{ text: "" }, { text: "" }]);
  const [displaySettings, setDisplaySettings] = useState({
    show_top: false,
    top_count: 3,
    top_order: "desc" as "asc" | "desc",
    show_bar_chart: true,
    bar_chart_orientation: "vertical" as "horizontal" | "vertical",
    bar_chart_options_count: 5,
  });
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
    setDisplaySettings({
      show_top: false,
      top_count: 3,
      top_order: "desc",
      show_bar_chart: true,
      bar_chart_orientation: "vertical",
      bar_chart_options_count: 5,
    });

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

    const validOptionCount = type === "free_text"
      ? 0
      : options.map((o) => String(o.text ?? "").trim()).filter(Boolean).length;
    const maxTop = Math.max(1, Math.floor(validOptionCount * 0.6));

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    setSubmitting(true);
    setError(null);
    try {
      const poll = await pollsApi.create({
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
        displaySettings: type === "free_text"
          ? null
          : {
            ...displaySettings,
            top_count: Math.max(1, Math.min(displaySettings.top_count, maxTop)),
            bar_chart_options_count: Math.max(1, Math.min(displaySettings.bar_chart_options_count, validOptionCount || 1)),
          },
      });
      showToast("Poll created!", "success");
      onPollCreated?.(((poll as any).data ?? poll));
      onClose();
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

          {type === "single_choice" || type === "multiple_choice" ? (
            <div className="poll-display-settings mt-6">
              <div className="form-section-title">Display Settings</div>

              <div className="display-setting-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={displaySettings.show_top}
                    onChange={(e: any) => setDisplaySettings((prev) => ({ ...prev, show_top: Boolean(e.currentTarget.checked) }))}
                    disabled={submitting}
                  />
                  <span>Show Top List</span>
                </label>

                {displaySettings.show_top ? (
                  <div className="sub-settings">
                    <div className="form-row">
                      <label>Top Count</label>
                      <input
                        className="form-input-sm"
                        type="number"
                        min={1}
                        value={displaySettings.top_count}
                        onInput={(e: any) => setDisplaySettings((prev) => ({ ...prev, top_count: Number(e.currentTarget.value || 1) }))}
                        disabled={submitting}
                      />
                      <span className="hint">Max 60% of options</span>
                    </div>
                    <div className="form-row">
                      <label>Order</label>
                      <select
                        className="form-select-sm"
                        value={displaySettings.top_order}
                        onChange={(e: any) => setDisplaySettings((prev) => ({ ...prev, top_order: String(e.currentTarget.value) as any }))}
                        disabled={submitting}
                      >
                        <option value="desc">Highest to Lowest</option>
                        <option value="asc">Lowest to Highest</option>
                      </select>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="display-setting-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={displaySettings.show_bar_chart}
                    onChange={(e: any) => setDisplaySettings((prev) => ({ ...prev, show_bar_chart: Boolean(e.currentTarget.checked) }))}
                    disabled={submitting}
                  />
                  <span>Show Bar Chart</span>
                </label>

                {displaySettings.show_bar_chart ? (
                  <div className="sub-settings">
                    <div className="form-row">
                      <label>Orientation</label>
                      <select
                        className="form-select-sm"
                        value={displaySettings.bar_chart_orientation}
                        onChange={(e: any) =>
                          setDisplaySettings((prev) => ({ ...prev, bar_chart_orientation: String(e.currentTarget.value) as any }))}
                        disabled={submitting}
                      >
                        <option value="vertical">Vertical</option>
                        <option value="horizontal">Horizontal</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <label>Options to Show</label>
                      <input
                        className="form-input-sm"
                        type="number"
                        min={1}
                        value={displaySettings.bar_chart_options_count}
                        onInput={(e: any) =>
                          setDisplaySettings((prev) => ({ ...prev, bar_chart_options_count: Number(e.currentTarget.value || 1) }))}
                        disabled={submitting}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
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

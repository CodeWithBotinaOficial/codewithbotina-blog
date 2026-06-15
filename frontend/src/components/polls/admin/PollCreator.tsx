import { useEffect, useRef, useState } from "preact/hooks";
import { Globe, Plus, Trash2, X } from "lucide-preact";
import { useToast } from "../../../hooks/useToast";
import { pollsApi } from "../../../lib/api";
import { t, type SupportedLanguage } from "../../../lib/i18n";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  language: string;
  onPollCreated?: (_poll: any) => void;
}

export default function PollCreator({ isOpen, onClose, language, onPollCreated }: Props) {
  const lang = (language ?? "en") as SupportedLanguage;
  const [type, setType] = useState("single_choice");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState(language);
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
  const validOptionCount = options.map((o) => String(o.text ?? "").trim()).filter(Boolean).length;
  const maxTopCount = Math.max(1, Math.floor(validOptionCount * 0.6));

  useEffect(() => {
    if (!isOpen) return;
    // Reset modal state when opened.
    setSubmitting(false);
    setError(null);
    setType("single_choice");
    setTitle("");
    setDescription("");
    setSelectedLanguage(language);
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
  }, [isOpen, language]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    // Keep display settings valid as options change.
    setDisplaySettings((prev) => {
      const next = { ...prev };
      if (next.top_count > maxTopCount) next.top_count = maxTopCount;
      if (validOptionCount > 0 && next.bar_chart_options_count > validOptionCount) {
        next.bar_chart_options_count = validOptionCount;
      }
      if (validOptionCount === 0) {
        next.top_count = 1;
        next.bar_chart_options_count = 1;
      }
      return next;
    });
  }, [validOptionCount, maxTopCount]);

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
      const message = t(lang, "polls.createModal.errors.titleRequired", "admin");
      setError(message);
      showToast(message, "error");
      return;
    }

    if (type !== "free_text") {
      const validOptions = options.map((o) => String(o.text ?? "").trim()).filter(Boolean);
      if (validOptions.length < minOptions) {
        const message = t(lang, "polls.createModal.errors.optionsRequired", "admin", { min: minOptions });
        setError(message);
        showToast(message, "error");
        return;
      }
    }

    const maxTop = maxTopCount;

    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

    setSubmitting(true);
    setError(null);
    try {
      const poll = await pollsApi.create({
        slug,
        title,
        description,
        type,
        language: selectedLanguage,
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
      showToast(t(lang, "polls.createModal.success", "admin"), "success");
      onPollCreated?.(((poll as any).data ?? poll));
      onClose();
    } catch (_err) {
      const message = t(lang, "polls.createModal.errors.createFailed", "admin");
      setError(message);
      showToast(message, "error");
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
      aria-label={t(lang, "polls.createModal.title", "admin")}
      onClick={() => onClose()}
    >
      <div className="poll-creator-container" ref={containerRef} onClick={(e) => e.stopPropagation()}>
        <div className="poll-creator-header">
          <h3>{t(lang, "polls.createModal.title", "admin")}</h3>
          <button type="button" className="btn-secondary" onClick={onClose} aria-label={t(lang, "polls.createModal.cancel", "admin")}>
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="poll-creator-body">
          {error ? (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold">{t(lang, "polls.createModal.type", "admin")}</label>
              <select
                className="input-field"
                value={type}
                onChange={(e: any) => setType(String(e.currentTarget.value))}
                disabled={submitting}
              >
                <option value="free_text">{t(lang, "polls.createModal.types.freeText", "admin")}</option>
                <option value="single_choice">{t(lang, "polls.createModal.types.singleChoice", "admin")}</option>
                <option value="multiple_choice">{t(lang, "polls.createModal.types.multipleChoice", "admin")}</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="poll-language" className="flex items-center gap-1.5 text-sm font-semibold">
                <Globe className="h-4 w-4" />
                {t(lang, "polls.createModal.language", "admin")}
              </label>
              <select
                id="poll-language"
                className="input-field"
                value={selectedLanguage}
                onChange={(e: any) => setSelectedLanguage(String(e.currentTarget.value))}
                disabled={submitting}
              >
                <option value="en">{t(lang, "polls.filters.english", "admin")}</option>
                <option value="es">{t(lang, "polls.filters.spanish", "admin")}</option>
                <option value="pt-br">{t(lang, "polls.filters.portuguese", "admin")}</option>
              </select>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-semibold">{t(lang, "polls.createModal.titleField", "admin")}</label>
            <input
              name="poll-title"
              className="input-field"
              value={title}
              placeholder={t(lang, "polls.createModal.titlePlaceholder", "admin")}
              onInput={(e: any) => setTitle(String(e.currentTarget.value))}
              disabled={submitting}
            />
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-semibold">{t(lang, "polls.createModal.description", "admin")}</label>
            <textarea
              className="input-field"
              value={description}
              onInput={(e: any) => setDescription(String(e.currentTarget.value))}
              rows={3}
              disabled={submitting}
            />
          </div>

          <div className="mt-4 space-y-2">
            <label className="text-sm font-semibold">{t(lang, "polls.createModal.closesAt", "admin")}</label>
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
              <label className="text-sm font-semibold">
                {t(lang, "polls.createModal.options", "admin", { min: minOptions, max: maxOptions })}
              </label>
              <div className="poll-options-list">
                {options.map((opt, i) => (
                  <div key={i} className="poll-option-row">
                    <input
                      className="input-field"
                      value={opt.text}
                      placeholder={t(lang, "polls.createModal.optionPlaceholder", "admin", { number: i + 1 })}
                      onInput={(e: any) => updateOption(i, String(e.currentTarget.value))}
                      disabled={submitting}
                    />
                    {options.length > minOptions ? (
                      <button
                        type="button"
                        className="btn-icon-danger"
                        onClick={() => removeOption(i)}
                        title={t(lang, "polls.createModal.removeOption", "admin")}
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
                {t(lang, "polls.createModal.addOption", "admin")}
              </button>
            </div>
          ) : null}

          {type === "single_choice" || type === "multiple_choice" ? (
            <div className="poll-display-settings mt-6">
              <div className="form-section-title">{t(lang, "polls.createModal.displaySettings", "admin")}</div>

              <div className="display-setting-row">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    checked={displaySettings.show_top}
                    onChange={(e: any) => setDisplaySettings((prev) => ({ ...prev, show_top: Boolean(e.currentTarget.checked) }))}
                    disabled={submitting}
                  />
                  <span>{t(lang, "polls.createModal.showTopList", "admin")}</span>
                </label>

                {displaySettings.show_top ? (
                  <div className="sub-settings">
                    <div className="form-row">
                      <label>{t(lang, "polls.createModal.topCount", "admin")}</label>
                      <input
                        className="form-input-sm"
                        type="number"
                        min={1}
                        max={maxTopCount}
                        value={displaySettings.top_count}
                        onInput={(e: any) => {
                          const raw = Number(e.currentTarget.value || 1);
                          const clamped = Math.max(1, Math.min(raw, maxTopCount));
                          setDisplaySettings((prev) => ({ ...prev, top_count: clamped }));
                        }}
                        disabled={submitting}
                      />
                      <span className="hint">{t(lang, "polls.createModal.maxTopHint", "admin", { max: maxTopCount, count: validOptionCount })}</span>
                    </div>
                    <div className="form-row">
                      <label>{t(lang, "polls.createModal.order", "admin")}</label>
                      <select
                        className="form-select-sm"
                        value={displaySettings.top_order}
                        onChange={(e: any) => setDisplaySettings((prev) => ({ ...prev, top_order: String(e.currentTarget.value) as any }))}
                        disabled={submitting}
                      >
                        <option value="desc">{t(lang, "polls.createModal.orderDesc", "admin")}</option>
                        <option value="asc">{t(lang, "polls.createModal.orderAsc", "admin")}</option>
                      </select>
                    </div>
                    {validOptionCount === 2 && maxTopCount === 1 ? (
                      <div className="validation-warning">
                        {t(lang, "polls.createModal.topTwoWarning", "admin")}
                      </div>
                    ) : null}
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
                  <span>{t(lang, "polls.createModal.showBarChart", "admin")}</span>
                </label>

                {displaySettings.show_bar_chart ? (
                  <div className="sub-settings">
                    <div className="form-row">
                      <label>{t(lang, "polls.createModal.orientation", "admin")}</label>
                      <select
                        className="form-select-sm"
                        value={displaySettings.bar_chart_orientation}
                        onChange={(e: any) =>
                          setDisplaySettings((prev) => ({ ...prev, bar_chart_orientation: String(e.currentTarget.value) as any }))}
                        disabled={submitting}
                      >
                        <option value="vertical">{t(lang, "polls.createModal.orientationVertical", "admin")}</option>
                        <option value="horizontal">{t(lang, "polls.createModal.orientationHorizontal", "admin")}</option>
                      </select>
                    </div>
                    <div className="form-row">
                      <label>{t(lang, "polls.createModal.optionsToShow", "admin")}</label>
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
            {t(lang, "polls.createModal.cancel", "admin")}
          </button>
          <button type="button" className="btn-primary" onClick={(e) => handleCreatePoll(e as any)} disabled={submitting || !title.trim()}>
            {submitting ? t(lang, "polls.createModal.creating", "admin") : t(lang, "polls.createModal.create", "admin")}
          </button>
        </div>
      </div>
    </div>
  );
}

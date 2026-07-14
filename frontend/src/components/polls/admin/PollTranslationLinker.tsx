import { useEffect, useMemo, useState } from "preact/hooks";
import { AlertCircle, Link2, Unlink2 } from "lucide-preact";
import { useToast } from "../../../hooks/useToast";
import { pollsApi } from "../../../lib/api";
import { t, type SupportedLanguage } from "../../../lib/i18n";

type PollSummary = {
  id: string;
  slug: string;
  title: string;
  type: string;
  language: string;
  option_count?: number;
  translation_group_id?: string | null;
};

interface Props {
  pollSlug: string;
  pollType: string;
  pollLanguage: string;
  optionCount: number;
  uiLanguage: SupportedLanguage;
  onChanged?: () => void;
}

export default function PollTranslationLinker({
  pollSlug,
  pollType,
  pollLanguage,
  optionCount,
  uiLanguage,
  onChanged,
}: Props) {
  const { showToast } = useToast();
  const [linkedPolls, setLinkedPolls] = useState<PollSummary[]>([]);
  const [availablePolls, setAvailablePolls] = useState<PollSummary[]>([]);
  const [selectedValue, setSelectedValue] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const linkedIds = useMemo(
    () => new Set(linkedPolls.map((poll) => poll.id)),
    [linkedPolls],
  );

  useEffect(() => {
    void load();
  }, [pollSlug, pollLanguage, pollType, optionCount]);

  async function load() {
    setLoading(true);
    try {
      const translationsBody = await pollsApi.translations(
        pollSlug,
        pollLanguage,
      );
      const translations = (translationsBody as any).data ?? translationsBody;
      const linked = (translations?.linked_polls ?? []) as PollSummary[];
      setLinkedPolls(linked);

      const listBody = await pollsApi.list({ limit: 50 });
      const allPolls = ((listBody as any).data ??
        listBody ??
        []) as PollSummary[];
      setAvailablePolls(
        allPolls.filter((poll) => {
          if (poll.slug === pollSlug && poll.language === pollLanguage) {
            return false;
          }
          if (poll.type !== pollType) return false;
          if (poll.language === pollLanguage) return false;
          if (
            linked.some((linkedPoll) => linkedPoll.language === poll.language)
          ) {
            return false;
          }
          if (linked.some((linkedPoll) => linkedPoll.id === poll.id)) {
            return false;
          }
          if (pollType !== "free_text") {
            return Number(poll.option_count ?? 0) === optionCount;
          }
          return true;
        }),
      );
    } catch (_err) {
      showToast(
        t(uiLanguage, "polls.translations.loadFailed", "admin"),
        "error",
      );
    } finally {
      setLoading(false);
    }
  }

  async function linkSelected() {
    if (!selectedValue) {
      showToast(
        t(uiLanguage, "polls.translations.selectPoll", "admin"),
        "error",
      );
      return;
    }
    const [linkedLanguage, linkedSlug] = selectedValue.split("|");
    if (!linkedLanguage || !linkedSlug) return;

    setSaving(true);
    try {
      await pollsApi.linkTranslation(
        pollSlug,
        pollLanguage,
        linkedSlug,
        linkedLanguage,
      );
      showToast(
        t(uiLanguage, "polls.translations.linkedSuccess", "admin"),
        "success",
      );
      setSelectedValue("");
      setShowForm(false);
      await load();
      onChanged?.();
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : t(uiLanguage, "polls.translations.linkFailed", "admin"),
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function unlinkPoll(poll: PollSummary) {
    if (!confirm(t(uiLanguage, "polls.translations.confirmUnlink", "admin"))) {
      return;
    }

    setSaving(true);
    try {
      await pollsApi.unlinkTranslation(poll.slug, poll.language);
      showToast(
        t(uiLanguage, "polls.translations.unlinked", "admin"),
        "success",
      );
      await load();
      onChanged?.();
    } catch (_err) {
      showToast(
        t(uiLanguage, "polls.translations.unlinkFailed", "admin"),
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  const languageLabel = (language: string) => {
    switch (language) {
      case "en":
        return "EN";
      case "es":
        return "ES";
      case "pt-br":
        return "PT-BR";
      default:
        return language.toUpperCase();
    }
  };

  if (loading) {
    return (
      <section className="poll-translation-linker loading">
        <div className="spinner-small" aria-hidden="true" />
        {t(uiLanguage, "polls.translations.loading", "admin")}
      </section>
    );
  }

  return (
    <section className="poll-translation-linker">
      <div className="section-title">
        <h2>{t(uiLanguage, "polls.translations.title", "admin")}</h2>
        <p className="help-text">
          {t(uiLanguage, "polls.translations.help", "admin")}
        </p>
      </div>

      {pollType !== "free_text" ? (
        <div className="critical-warning">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
          <div>
            <strong>
              {t(uiLanguage, "polls.translations.orderWarningTitle", "admin")}
            </strong>
            <p>
              {t(uiLanguage, "polls.translations.orderWarningText", "admin")}
            </p>
            <details>
              <summary>
                {t(uiLanguage, "polls.translations.example", "admin")}
              </summary>
              <div className="example-box">
                <div className="example-column">
                  <strong>Spanish</strong>
                  <div>1. Python</div>
                  <div>2. Java</div>
                  <div>3. C++</div>
                </div>
                <div className="example-column">
                  <strong>English</strong>
                  <div>1. Python</div>
                  <div>2. C++</div>
                  <div>3. Java</div>
                </div>
                <p className="warning-text">
                  {t(
                    uiLanguage,
                    "polls.translations.orderWarningExample",
                    "admin",
                  )}
                </p>
              </div>
            </details>
          </div>
        </div>
      ) : null}

      <div className="linked-polls">
        <h3>{t(uiLanguage, "polls.translations.linkedTitle", "admin")}</h3>
        {linkedPolls.length === 0 ? (
          <p className="empty-message">
            {t(uiLanguage, "polls.translations.noneLinked", "admin")}
          </p>
        ) : (
          <div className="linked-list">
            {linkedPolls.map((poll) => (
              <div key={poll.id} className="linked-item">
                <div className="linked-info">
                  <span className="language-badge">
                    {languageLabel(poll.language)}
                  </span>
                  <span className="title">{poll.title}</span>
                  <span className="slug">{poll.slug}</span>
                </div>
                <button
                  type="button"
                  className="btn-remove"
                  disabled={saving || !linkedIds.has(poll.id)}
                  onClick={() => unlinkPoll(poll)}
                >
                  <Unlink2 className="h-4 w-4" />
                  {t(uiLanguage, "polls.translations.unlink", "admin")}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="link-form">
        {!showForm ? (
          <button
            type="button"
            className="btn-secondary inline-flex items-center gap-2"
            onClick={() => setShowForm(true)}
          >
            <Link2 className="h-4 w-4" />
            {t(uiLanguage, "polls.translations.linkNew", "admin")}
          </button>
        ) : (
          <div className="form-group">
            <label>
              {t(uiLanguage, "polls.translations.selectLanguage", "admin")}
            </label>
            {availablePolls.length === 0 ? (
              <p className="empty-message">
                {t(uiLanguage, "polls.translations.noAvailable", "admin")}
              </p>
            ) : (
              <>
                <select
                  className="form-select"
                  value={selectedValue}
                  disabled={saving}
                  onChange={(e) =>
                    setSelectedValue(
                      (e.currentTarget as HTMLSelectElement).value,
                    )
                  }
                >
                  <option value="">
                    {t(uiLanguage, "polls.translations.selectPoll", "admin")}
                  </option>
                  {availablePolls.map((poll) => (
                    <option
                      key={poll.id}
                      value={`${poll.language}|${poll.slug}`}
                    >
                      {languageLabel(poll.language)} - {poll.title}
                    </option>
                  ))}
                </select>
                <div className="form-actions">
                  <button
                    type="button"
                    className="btn-secondary"
                    disabled={saving}
                    onClick={() => setShowForm(false)}
                  >
                    {t(uiLanguage, "polls.translations.cancel", "admin")}
                  </button>
                  <button
                    type="button"
                    className="btn-primary"
                    disabled={saving || !selectedValue}
                    onClick={linkSelected}
                  >
                    {saving
                      ? t(uiLanguage, "polls.translations.linking", "admin")
                      : t(uiLanguage, "polls.translations.link", "admin")}
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="info-box">
        {t(uiLanguage, "polls.translations.infoMessage", "admin")}
      </div>
    </section>
  );
}

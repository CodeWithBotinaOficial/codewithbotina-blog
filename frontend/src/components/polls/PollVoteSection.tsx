import { useEffect, useMemo, useState } from "preact/hooks";
import { CheckCircle2, LogIn, Send, Trash2 } from "lucide-preact";
import { useSession } from "../../hooks/useSession";
import { useToast } from "../../hooks/useToast";
import { t, type SupportedLanguage } from "../../lib/i18n";
import { pollsApi } from "../../lib/api";

export default function PollVoteSection({ poll, userVote, onVote, language }: any) {
  const { user } = useSession();
  const { showToast } = useToast();
  const lang = (language ?? "en") as SupportedLanguage;
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [freeText, setFreeText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const pollOptions = useMemo(() => poll.poll_options ?? poll.options ?? [], [poll]);

  useEffect(() => {
    // Initialize from existing vote (when the embed refreshes).
    if (!Array.isArray(userVote) || userVote.length === 0) {
      setSelectedOptions([]);
      setFreeText("");
      return;
    }

    if (poll.type === "free_text") {
      const response = String(userVote[0]?.free_text_response ?? userVote[0]?.text ?? "");
      setFreeText(response);
      return;
    }

    const ids = userVote
      .map((v: any) => String(v.poll_option_id ?? v.optionId ?? v.option_id ?? ""))
      .filter(Boolean);

    if (poll.type === "single_choice") {
      setSelectedOptions(ids.length ? [ids[0]] : []);
    } else if (poll.type === "multiple_choice") {
      setSelectedOptions(Array.from(new Set(ids)));
    }
  }, [poll?.type, userVote]);

  async function handleVote() {
    if (!user) {
      showToast(t(lang, "polls.signInToVote", "post"), "error");
      return;
    }

    setSubmitting(true);
    try {
      let payload: any = {};

      if (poll.type === "free_text") {
        const text = freeText.trim();
        if (!text) {
          showToast(t(lang, "polls.freeText.placeholder", "post"), "error");
          return;
        }
        payload = { text };
      } else if (poll.type === "single_choice") {
        if (!selectedOptions[0]) {
          showToast(t(lang, "polls.vote", "post"), "error");
          return;
        }
        payload = { optionId: selectedOptions[0] };
      } else if (poll.type === "multiple_choice") {
        if (selectedOptions.length === 0) {
          showToast(t(lang, "polls.vote", "post"), "error");
          return;
        }
        payload = { optionIds: selectedOptions };
      }

      await pollsApi.vote(poll.slug, language, payload);
      {
        showToast("✅ " + t(lang, "polls.submit", "post"), "success");
        onVote();
      }
    } catch (_err) {
      showToast("Failed to submit vote", "error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove() {
    if (!confirm(t(lang, "polls.removeVote", "post") + "?")) return;
    setSubmitting(true);
    try {
      await pollsApi.removeVote(poll.slug, language);
      {
        showToast(t(lang, "polls.removeVote", "post"), "success");
        setSelectedOptions([]);
        setFreeText("");
        onVote();
      }
    } catch (_err) {
      showToast("Failed to remove vote", "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    const next = typeof window !== "undefined" ? encodeURIComponent(window.location.pathname) : "";
    return (
      <div className="poll-auth-required">
        <LogIn className="h-5 w-5" aria-hidden="true" />
        <div>{t(lang, "polls.signInToVote", "post")}</div>
        <a href={`/auth/signin?next=${next}`} className="btn-primary">
          {t(lang, "polls.signInToVote", "post")}
        </a>
      </div>
    );
  }

  if (poll.type === "free_text" && Array.isArray(userVote) && userVote.length > 0) {
    const response = String(userVote[0]?.free_text_response ?? "");
    return (
      <div className="poll-already-voted poll-free-text-submitted">
        <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
        <div>
          <div className="poll-voted-title">{t(lang, "polls.freeText.submitted", "post")}</div>
          {response ? <div className="poll-voted-response">"{response}"</div> : null}
          <div className="poll-voted-note">You cannot edit free-text poll responses.</div>
        </div>
      </div>
    );
  }

  return (
    <div className="poll-vote-section">
      {poll.type === "free_text" ? (
        <div className="poll-free-text">
          <textarea
            className="poll-textarea"
            value={freeText}
            onInput={(e: any) => setFreeText(String(e.currentTarget.value ?? ""))}
            rows={4}
            maxLength={500}
            placeholder={t(lang, "polls.freeText.placeholder", "post")}
            disabled={submitting}
          />
          <div className="poll-char-count">{freeText.length}/500</div>
          <div className="poll-actions">
            <button type="button" className="btn-primary poll-submit" onClick={handleVote} disabled={!freeText.trim() || submitting}>
              <Send className="h-4 w-4" aria-hidden="true" />
              {submitting ? "Submitting..." : t(lang, "polls.submit", "post")}
            </button>
          </div>
        </div>
      ) : null}

      {poll.type === "single_choice" ? (
        <div className="poll-single-choice">
          <fieldset disabled={submitting}>
            {pollOptions.map((opt: any) => (
              <label key={opt.id} className={`poll-option ${selectedOptions.includes(String(opt.id)) ? "selected" : ""}`}>
                <input
                  type="radio"
                  name={`poll-${poll.slug}`}
                  value={String(opt.id)}
                  checked={selectedOptions.includes(String(opt.id))}
                  onChange={() => setSelectedOptions([String(opt.id)])}
                />
                <span className="option-text">{opt.option_text}</span>
              </label>
            ))}
          </fieldset>

          <div className="poll-actions">
            <button type="button" className="btn-primary" onClick={handleVote} disabled={selectedOptions.length === 0 || submitting}>
              <Send className="h-4 w-4" aria-hidden="true" />
              {submitting ? "Submitting..." : t(lang, "polls.vote", "post")}
            </button>
            {Array.isArray(userVote) && userVote.length > 0 ? (
              <button type="button" className="btn-secondary poll-remove" onClick={handleRemove} disabled={submitting}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t(lang, "polls.removeVote", "post")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {poll.type === "multiple_choice" ? (
        <div className="poll-multiple-choice">
          <fieldset disabled={submitting}>
            {pollOptions.map((opt: any) => (
              <label key={opt.id} className={`poll-option ${selectedOptions.includes(String(opt.id)) ? "selected" : ""}`}>
                <input
                  type="checkbox"
                  value={String(opt.id)}
                  checked={selectedOptions.includes(String(opt.id))}
                  onChange={(e: any) => {
                    const checked = Boolean(e.currentTarget.checked);
                    const id = String(opt.id);
                    setSelectedOptions((prev) => checked ? Array.from(new Set([...prev, id])) : prev.filter((x) => x !== id));
                  }}
                />
                <span className="option-text">{opt.option_text}</span>
              </label>
            ))}
          </fieldset>

          <div className="poll-actions">
            <button type="button" className="btn-primary" onClick={handleVote} disabled={selectedOptions.length === 0 || submitting}>
              <Send className="h-4 w-4" aria-hidden="true" />
              {submitting ? "Submitting..." : `${t(lang, "polls.vote", "post")} (${selectedOptions.length})`}
            </button>
            {Array.isArray(userVote) && userVote.length > 0 ? (
              <button type="button" className="btn-secondary poll-remove" onClick={handleRemove} disabled={submitting}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                {t(lang, "polls.removeVote", "post")}
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

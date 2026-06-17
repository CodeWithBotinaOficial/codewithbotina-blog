import { useEffect, useMemo, useState } from "preact/hooks";
import { BarChart3, Clock, Edit3, Globe, Lock, Trash2, Unlock, Users } from "lucide-preact";
import { useSession } from "../../hooks/useSession";
import { useToast } from "../../hooks/useToast";
import { SUPPORTED_LANGUAGES, t, type SupportedLanguage } from "../../lib/i18n";
import { getPollStatusName, getPollTypeName, getPollVoteCount } from "../../lib/poll-i18n";
import { pollsApi } from "../../lib/api";
import PollVoteSection from "./PollVoteSection";
import PollResults from "./PollResults";
import PollAnalytics from "./admin/PollAnalytics";

interface Props {
  slug: string;
  language?: string;
  pollLanguage?: string;
}

export default function PollEmbed({ slug, language = 'en', pollLanguage }: Props) {
  const uiLanguage = (language ?? "en") as SupportedLanguage;
  const [poll, setPoll] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<any>(null);
  const [voteLoading, setVoteLoading] = useState(false);
  const [resultsKey, setResultsKey] = useState(0);
  const [activePollLang, setActivePollLang] = useState(language);
  const { user, isAdmin } = useSession();
  const { showToast } = useToast();
  const pollContentLanguage = (activePollLang ?? poll?.language ?? pollLanguage ?? language ?? "en") as SupportedLanguage;

  useEffect(() => {
    loadPoll();
  }, [slug, language, pollLanguage, user?.id]);

  async function loadPoll() {
    setLoading(true);
    try {
      setUserVote(null);

      const fallbackLanguages = [
        ...SUPPORTED_LANGUAGES.filter((supportedLanguage) => supportedLanguage !== language && supportedLanguage !== "en"),
        "en",
      ];
      const uniqueLangs = [...new Set([
        pollLanguage,
        language,
        ...fallbackLanguages,
      ].filter(Boolean) as string[])];

      let pollData = null;
      let foundLang = language;

      console.debug(`[Poll ${slug}] Trying languages: ${uniqueLangs.join(", ")}`);
      for (const l of uniqueLangs) {
        try {
          const body = await pollsApi.get(slug, l);
          const data = (body as any).data ?? body;
          if (data && data.id) {
            pollData = data;
            foundLang = String(data.language ?? l);
            console.debug(`[Poll ${slug}] Found in language: ${foundLang}`);
            break;
          }
        } catch (_err) {
          console.debug(`[Poll ${slug}] Not found in language: ${l}`);
          // Try next language
        }
      }

      if (!pollData) {
        setPoll(null);
        return;
      }

      setActivePollLang(pollData.language ?? foundLang);

      // Supabase can return related tables as arrays.
      if (Array.isArray(pollData.poll_display_settings)) {
        pollData.poll_display_settings = pollData.poll_display_settings[0] ?? null;
      }
      setPoll(pollData);

      if (user) {
        setVoteLoading(true);
        const voteBody = await pollsApi.myVote(slug, pollData.language ?? foundLang).catch(() => null);
        if (voteBody) setUserVote((voteBody as any).data ?? voteBody);
        setVoteLoading(false);
      } else {
        setVoteLoading(false);
      }
    } catch (err) {
      console.error('Failed to load poll', err);
      setPoll(null);
    } finally {
      setLoading(false);
    }
  }

  const closingDate = useMemo(() => {
    if (!poll?.closes_at) return null;
    const d = new Date(poll.closes_at);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }, [poll?.closes_at]);

  if (loading) {
    return (
      <div className="poll-loading">
        <div className="loading-spinner" aria-hidden="true" />
        <div>{t(uiLanguage, "polls.loading", "post")}</div>
      </div>
    );
  }
  if (!poll) return <div className="poll-error">{t(uiLanguage, "polls.error.notFound", "post")}</div>;

  const isClosed = poll.status === 'closed' || (poll.closes_at && new Date(poll.closes_at) < new Date());
  const voteCount = typeof poll.vote_count === "number"
    ? poll.vote_count
    : Array.isArray(poll.poll_votes) && poll.poll_votes.length > 0 && typeof poll.poll_votes[0]?.count === "number"
    ? poll.poll_votes[0].count
    : undefined;

  const toggleStatus = async () => {
    const next = poll.status === "open" ? "closed" : "open";
    try {
      await pollsApi.update(poll.slug, activePollLang, { status: next });
      showToast(t(uiLanguage, "polls.admin.statusUpdated", "post", { status: getPollStatusName(uiLanguage, next) }), "success");
      await loadPoll();
    } catch (_err) {
      showToast(t(uiLanguage, "polls.admin.updateFailed", "post"), "error");
    }
  };

  const deletePoll = async () => {
    const confirmSlug = prompt(t(uiLanguage, "polls.admin.confirmDelete", "post", { slug: poll.slug }));
    if (confirmSlug !== poll.slug) return;
    try {
      await pollsApi.delete(poll.slug, activePollLang);
      showToast(t(uiLanguage, "polls.admin.deleted", "post"), "success");
      setPoll(null);
    } catch (_err) {
      showToast(t(uiLanguage, "polls.admin.deleteFailed", "post"), "error");
    }
  };

  const getLanguageLabel = (l: string) => {
    switch (l) {
      case 'en': return '🇺🇸 English';
      case 'es': return '🇪🇸 Español';
      case 'pt-br': return '🇧🇷 Português';
      default: return l.toUpperCase();
    }
  };

  return (
    <div className="poll-embed">
      <div className="poll-header">
        <div className="poll-title-row">
          <h3 className="poll-title">{poll.title}</h3>

          {isClosed ? (
            <span className="poll-status-badge closed">
              <Lock className="h-4 w-4" aria-hidden="true" />
              {t(uiLanguage, "polls.status.closed", "post")}
            </span>
          ) : closingDate ? (
            <span className="poll-status-badge open">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {t(uiLanguage, "polls.status.closesAt", "post", { date: closingDate })}
            </span>
          ) : (
            <span className="poll-status-badge open">{t(uiLanguage, "polls.status.open", "post")}</span>
          )}
        </div>

        {poll.description ? <p className="poll-description">{poll.description}</p> : null}

        {isAdmin ? (
          <div className="poll-admin-controls">
            <button type="button" className="btn-admin-sm" onClick={toggleStatus} title={poll.status === "open" ? t(uiLanguage, "polls.admin.closeTitle", "post") : t(uiLanguage, "polls.admin.openTitle", "post")}>
              {poll.status === "open" ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              {poll.status === "open" ? t(uiLanguage, "polls.admin.close", "post") : t(uiLanguage, "polls.admin.open", "post")}
            </button>
            <a
              className="btn-admin-sm"
              href={`/${language}/admin/polls/${encodeURIComponent(poll.slug)}/edit?lang=${encodeURIComponent(poll.language ?? activePollLang)}`}
              title={t(uiLanguage, "polls.admin.editTitle", "post")}
            >
              <Edit3 className="h-4 w-4" />
              {t(uiLanguage, "polls.admin.edit", "post")}
            </a>
            <a
              className="btn-admin-sm"
              href={`/${language}/admin/polls?lang=${encodeURIComponent(poll.language ?? activePollLang)}`}
              title={t(uiLanguage, "polls.admin.manageTitle", "post")}
            >
              <BarChart3 className="h-4 w-4" />
              {t(uiLanguage, "polls.admin.manage", "post")}
            </a>
            <button type="button" className="btn-admin-sm danger" onClick={deletePoll} title={t(uiLanguage, "polls.admin.deleteTitle", "post")}>
              <Trash2 className="h-4 w-4" />
              {t(uiLanguage, "polls.admin.delete", "post")}
            </button>
          </div>
        ) : null}

        <div className="poll-meta">
          <span className="poll-metaitem">
            {poll.type === "free_text" ? "✍️ " : poll.type === "single_choice" ? "🔘 " : "☑️ "}
            {getPollTypeName(uiLanguage, poll.type)}
          </span>
          <span className="poll-metaitem">
            <Globe className="h-4 w-4" aria-hidden="true" />
            {getLanguageLabel(poll.language ?? pollContentLanguage)}
          </span>
          {typeof voteCount === "number" ? (
            <span className="poll-metaitem">
              <Users className="h-4 w-4" aria-hidden="true" />
              {getPollVoteCount(uiLanguage, voteCount)}
            </span>
          ) : null}
        </div>
      </div>

      {!isClosed && !voteLoading && (
        <PollVoteSection
          poll={poll}
          userVote={userVote}
          onVote={async () => {
            await loadPoll();
            setResultsKey((v) => v + 1);
          }}
          language={uiLanguage}
          pollLanguage={pollContentLanguage}
        />
      )}

      <PollResults key={resultsKey} poll={poll} userVote={userVote} language={uiLanguage} pollLanguage={pollContentLanguage} />

      {isAdmin ? (
        <PollAnalytics slug={poll.slug} language={uiLanguage} pollLanguage={pollContentLanguage} />
      ) : null}
    </div>
  );
}

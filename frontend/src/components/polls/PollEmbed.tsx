import { useEffect, useMemo, useState } from "preact/hooks";
import { BarChart3, Clock, Edit3, Lock, Trash2, Unlock, Users } from "lucide-preact";
import { useSession } from "../../hooks/useSession";
import { useToast } from "../../hooks/useToast";
import { t, type SupportedLanguage } from "../../lib/i18n";
import { pollsApi } from "../../lib/api";
import PollVoteSection from "./PollVoteSection";
import PollResults from "./PollResults";
import PollAnalytics from "./admin/PollAnalytics";

interface Props {
  slug: string;
  language?: string;
}

export default function PollEmbed({ slug, language = 'en' }: Props) {
  const [poll, setPoll] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<any>(null);
  const [voteLoading, setVoteLoading] = useState(false);
  const [resultsKey, setResultsKey] = useState(0);
  const { user, isAdmin } = useSession();
  const { showToast } = useToast();
  const lang = (language ?? "en") as SupportedLanguage;

  useEffect(() => {
    loadPoll();
  }, [slug, language, user?.id]);

  async function loadPoll() {
    setLoading(true);
    try {
      setUserVote(null);
      const body = await pollsApi.get(slug, language);
      const pollData = (body as any).data ?? body;
      if (!pollData) {
        setPoll(null);
        return;
      }
      // Supabase can return related tables as arrays.
      if (Array.isArray(pollData.poll_display_settings)) {
        pollData.poll_display_settings = pollData.poll_display_settings[0] ?? null;
      }
      setPoll(pollData);

      if (user) {
        setVoteLoading(true);
        const voteBody = await pollsApi.myVote(slug, language).catch(() => null);
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
        <div>Loading poll...</div>
      </div>
    );
  }
  if (!poll) return <div className="poll-error">Poll not found</div>;

  const isClosed = poll.status === 'closed' || (poll.closes_at && new Date(poll.closes_at) < new Date());
  const voteCount = typeof poll.vote_count === "number"
    ? poll.vote_count
    : Array.isArray(poll.poll_votes) && poll.poll_votes.length > 0 && typeof poll.poll_votes[0]?.count === "number"
    ? poll.poll_votes[0].count
    : undefined;

  const toggleStatus = async () => {
    const next = poll.status === "open" ? "closed" : "open";
    try {
      await pollsApi.update(poll.slug, language, { status: next });
      showToast(`Poll ${next}`, "success");
      await loadPoll();
    } catch (_err) {
      showToast("Failed to update poll", "error");
    }
  };

  const deletePoll = async () => {
    const confirmSlug = prompt(`Type "${poll.slug}" to confirm deletion:`);
    if (confirmSlug !== poll.slug) return;
    try {
      await pollsApi.delete(poll.slug, language);
      showToast("Poll deleted", "success");
      setPoll(null);
    } catch (_err) {
      showToast("Failed to delete poll", "error");
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
              {t(lang, "polls.closed", "post")}
            </span>
          ) : closingDate ? (
            <span className="poll-status-badge open">
              <Clock className="h-4 w-4" aria-hidden="true" />
              {t(lang, "polls.closes", "post", { date: closingDate })}
            </span>
          ) : (
            <span className="poll-status-badge open">{t(lang, "polls.open", "post")}</span>
          )}
        </div>

        {poll.description ? <p className="poll-description">{poll.description}</p> : null}

        {isAdmin ? (
          <div className="poll-admin-controls">
            <button type="button" className="btn-admin-sm" onClick={toggleStatus} title={poll.status === "open" ? "Close poll" : "Open poll"}>
              {poll.status === "open" ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              {poll.status === "open" ? "Close" : "Open"}
            </button>
            <a
              className="btn-admin-sm"
              href={`/${language}/admin/polls/${encodeURIComponent(poll.slug)}/edit?lang=${encodeURIComponent(poll.language ?? language)}`}
              title="Edit poll"
            >
              <Edit3 className="h-4 w-4" />
              Edit
            </a>
            <a
              className="btn-admin-sm"
              href={`/${language}/admin/polls?lang=${encodeURIComponent(poll.language ?? language)}`}
              title="Manage polls"
            >
              <BarChart3 className="h-4 w-4" />
              Manage
            </a>
            <button type="button" className="btn-admin-sm danger" onClick={deletePoll} title="Delete poll">
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        ) : null}

        <div className="poll-meta">
          <span className="poll-metaitem">
            {poll.type === "free_text" ? "✍️ Free Text" : poll.type === "single_choice" ? "🔘 Single Choice" : "☑️ Multiple Choice"}
          </span>
          {typeof voteCount === "number" ? (
            <span className="poll-metaitem">
              <Users className="h-4 w-4" aria-hidden="true" />
              {voteCount} {voteCount === 1 ? "vote" : "votes"}
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
          language={language}
        />
      )}

      <PollResults key={resultsKey} poll={poll} userVote={userVote} language={language} />

      {isAdmin ? (
        <PollAnalytics slug={poll.slug} language={language} />
      ) : null}
    </div>
  );
}

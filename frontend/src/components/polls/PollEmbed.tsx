import { useEffect, useMemo, useState } from "preact/hooks";
import { Clock, Lock, Users } from "lucide-preact";
import { useSession } from "../../hooks/useSession";
import { t, type SupportedLanguage } from "../../lib/i18n";
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
  const { user, isAdmin } = useSession();
  const lang = (language ?? "en") as SupportedLanguage;

  useEffect(() => {
    loadPoll();
  }, [slug, language]);

  async function loadPoll() {
    setLoading(true);
    try {
      const res = await fetch(`/api/polls/${slug}?lang=${language}`);
      if (!res.ok) {
        setPoll(null);
        return;
      }
      const body = await res.json();
      setPoll(body.data ?? body);

      if (user) {
        const voteRes = await fetch(`/api/polls/${slug}/my-vote?lang=${language}`, { credentials: 'include' });
        if (voteRes.ok) {
          const voteBody = await voteRes.json();
          setUserVote(voteBody.data ?? voteBody);
        }
      }
    } catch (err) {
      console.error('Failed to load poll', err);
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

      {!isClosed && (
        <PollVoteSection poll={poll} userVote={userVote} onVote={loadPoll} language={language} />
      )}

      <PollResults poll={poll} userVote={userVote} language={language} />

      {isAdmin ? (
        <PollAnalytics slug={poll.slug} language={language} />
      ) : null}
    </div>
  );
}

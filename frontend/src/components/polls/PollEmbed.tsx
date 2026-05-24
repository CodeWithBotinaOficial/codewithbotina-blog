import { useEffect, useState } from 'preact/hooks';
import { useSession } from '@/hooks/useSession';
import PollVoteSection from './PollVoteSection';
import PollResults from './PollResults';

interface Props {
  slug: string;
  language?: string;
}

export default function PollEmbed({ slug, language = 'en' }: Props) {
  const [poll, setPoll] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userVote, setUserVote] = useState<any>(null);
  const { user } = useSession();

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

  if (loading) return <div className="poll-loading">Loading poll...</div>;
  if (!poll) return <div className="poll-error">Poll not found</div>;

  const isClosed = poll.status === 'closed' || (poll.closes_at && new Date(poll.closes_at) < new Date());

  return (
    <div className="poll-embed">
      <div className="poll-header">
        <h3>{poll.title}</h3>
        {poll.description && <p>{poll.description}</p>}
        {isClosed && <span className="poll-status">Closed</span>}
      </div>

      {!isClosed && (
        <PollVoteSection poll={poll} userVote={userVote} onVote={loadPoll} language={language} />
      )}

      <PollResults poll={poll} userVote={userVote} language={language} />
    </div>
  );
}


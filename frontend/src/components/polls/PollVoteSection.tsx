import { useState } from 'preact/hooks';
import { useSession } from '@/hooks/useSession';
import { useToast } from '@/hooks/useToast';

export default function PollVoteSection({ poll, userVote, onVote, language }: any) {
  const { user } = useSession();
  const { showToast } = useToast();
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [freeText, setFreeText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleVote() {
    if (!user) {
      showToast('Please sign in to vote', 'error');
      return;
    }

    setSubmitting(true);
    try {
      let payload: any = {};
      if (poll.type === 'free_text') payload = { text: freeText };
      else if (poll.type === 'single_choice') payload = { optionId: selectedOptions[0] };
      else if (poll.type === 'multiple_choice') payload = { optionIds: selectedOptions };

      const res = await fetch(`/api/polls/${poll.slug}/vote?lang=${language}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        showToast('Vote submitted!', 'success');
        onVote();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to submit vote', 'error');
      }
    } catch (err) {
      showToast('Failed to submit vote', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/polls/${poll.slug}/remove-vote?lang=${language}`, { method: 'DELETE', credentials: 'include' });
      if (res.ok) {
        showToast('Vote removed', 'success');
        setSelectedOptions([]);
        onVote();
      } else {
        const err = await res.json();
        showToast(err.error || 'Failed to remove vote', 'error');
      }
    } catch (err) {
      showToast('Failed to remove vote', 'error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) return (
    <div className="poll-auth-required">Sign in to vote</div>
  );

  if (poll.type === 'free_text' && Array.isArray(userVote) && userVote.length > 0) {
    return <div className="poll-already-voted">You have already submitted a response</div>;
  }

  return (
    <div className="poll-vote-section">
      {poll.type === 'free_text' && (
        <div>
          <textarea value={freeText} onInput={(e: any) => setFreeText(e.target.value)} rows={4} />
          <button onClick={handleVote} disabled={!freeText.trim() || submitting}>Submit Response</button>
        </div>
      )}

      {poll.type === 'single_choice' && (
        <div>
          {poll.poll_options?.map((opt: any) => (
            <label key={opt.id}>
              <input type="radio" name="poll-option" value={opt.id} checked={selectedOptions.includes(opt.id)} onChange={() => setSelectedOptions([opt.id])} />
              {opt.option_text}
            </label>
          ))}
          <div>
            <button onClick={handleVote} disabled={selectedOptions.length === 0 || submitting}>Vote</button>
            {userVote && <button onClick={handleRemove} disabled={submitting}>Remove Response</button>}
          </div>
        </div>
      )}

      {poll.type === 'multiple_choice' && (
        <div>
          {poll.poll_options?.map((opt: any) => (
            <label key={opt.id}>
              <input type="checkbox" value={opt.id} checked={selectedOptions.includes(opt.id)} onChange={(e: any) => {
                if (e.target.checked) setSelectedOptions([...selectedOptions, opt.id]);
                else setSelectedOptions(selectedOptions.filter(id => id !== opt.id));
              }} />
              {opt.option_text}
            </label>
          ))}
          <div>
            <button onClick={handleVote} disabled={selectedOptions.length === 0 || submitting}>Vote</button>
            {userVote && <button onClick={handleRemove} disabled={submitting}>Remove Response</button>}
          </div>
        </div>
      )}
    </div>
  );
}


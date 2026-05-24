import { useEffect, useState } from 'preact/hooks';
import WordCloud from './visualizations/WordCloud';
import TopList from './visualizations/TopList';
import PollBarChart from './visualizations/BarChart';

export default function PollResults({ poll, userVote, language }: any) {
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    loadResults();
  }, [poll?.id]);

  async function loadResults() {
    try {
      const res = await fetch(`/api/polls/${poll.slug}/results?lang=${language}`);
      if (!res.ok) return;
      const body = await res.json();
      setResults(body.data ?? body);
    } catch (err) {
      console.error('Failed to load results', err);
    }
  }

  if (!results) return <div className="poll-results-loading">Loading results...</div>;

  if (poll.type === 'free_text') {
    return <WordCloud responses={results.freeTextResponses?.map((r: any) => r.free_text_response)} />;
  }

  const options = results.options?.map((o: any) => ({ option_text: o.option_text, vote_count: o.vote_count ?? 0, color: o.color ?? '#888' })) ?? [];

  return (
    <div className="poll-results">
      {poll.poll_display_settings?.show_top && (
        <TopList options={options} topCount={poll.poll_display_settings.top_count || Math.min(3, options.length)} order={poll.poll_display_settings.top_order || 'desc'} />
      )}

      {poll.poll_display_settings?.show_bar_chart && (
        <PollBarChart options={options} orientation={poll.poll_display_settings.bar_chart_orientation || 'vertical'} optionsCount={poll.poll_display_settings.bar_chart_options_count || options.length} />
      )}
    </div>
  );
}


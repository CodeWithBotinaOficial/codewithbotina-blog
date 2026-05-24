import { useRef } from 'preact/hooks';
import DownloadButton from './DownloadButton';

interface Props {
  options: Array<{ option_text: string; vote_count: number }>;
  topCount: number;
  order: 'asc' | 'desc';
}

export default function TopList({ options, topCount, order }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const sorted = [...options]
    .sort((a, b) => (order === 'desc' ? b.vote_count - a.vote_count : a.vote_count - b.vote_count))
    .slice(0, topCount);

  return (
    <div ref={containerRef} className="poll-top-list">
      <h4>Top {topCount} Results</h4>
      <ol className="top-list">
        {sorted.map((opt, i) => (
          <li key={opt.option_text}>
            #{i + 1}: {opt.option_text} ({opt.vote_count})
          </li>
        ))}
      </ol>
      <DownloadButton elementRef={containerRef} filename="top-list" />
    </div>
  );
}


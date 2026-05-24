import { useRef } from 'preact/hooks';
import DownloadButton from './DownloadButton';

interface Props {
  options: Array<{ option_text: string; vote_count: number; color: string }>;
  orientation: 'horizontal' | 'vertical';
  optionsCount: number;
}

export default function PollBarChart({ options, orientation, optionsCount }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const data = options.slice(0, optionsCount);

  // Simple bar chart fallback (recharts requires React)
  const maxVotes = Math.max(...data.map(o => o.vote_count || 1), 1);

  return (
    <div ref={containerRef} className="poll-bar-chart">
      <h4>Vote Distribution</h4>
      <div className="bar-chart-container">
        {orientation === 'horizontal' ? (
          <div className="bar-chart-horizontal">
            {data.map(opt => (
              <div key={opt.option_text} className="bar-row">
                <span className="bar-label">{opt.option_text}</span>
                <div className="bar" style={{ width: `${(opt.vote_count / maxVotes) * 100}%`, backgroundColor: opt.color }} />
                <span className="bar-value">{opt.vote_count}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bar-chart-vertical">
            {data.map(opt => (
              <div key={opt.option_text} className="bar-col">
                <div className="bar" style={{ height: `${(opt.vote_count / maxVotes) * 200}px`, backgroundColor: opt.color }} />
                <span className="bar-label">{opt.option_text}</span>
                <span className="bar-value">{opt.vote_count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <DownloadButton elementRef={containerRef} filename="bar-chart" />
    </div>
  );
}


import { useRef } from 'preact/hooks';
import DownloadButton from './DownloadButton';
import { t, type SupportedLanguage } from '../../../lib/i18n';

interface Props {
  options: Array<{ id?: string; option_text: string; vote_count: number; color: string }>;
  orientation: 'horizontal' | 'vertical';
  optionsCount: number;
  language: SupportedLanguage;
}

export default function PollBarChart({ options, orientation, optionsCount, language }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Sort and slice dynamically
  const sorted = [...options]
    .sort((a, b) => (b.vote_count ?? 0) - (a.vote_count ?? 0))
    .slice(0, optionsCount);

  const maxVotes = Math.max(...sorted.map(o => o.vote_count || 1), 1);

  return (
    <div ref={containerRef} className="poll-bar-chart">
      <div className="poll-viz-toolbar">
        <div className="poll-viz-title">{t(language, "polls.results.chartTitle", "post")}</div>
        <DownloadButton elementRef={containerRef} filename="bar-chart" type="chart" language={language} />
      </div>
      <div className="bar-chart-container">
        {orientation === 'horizontal' ? (
          <div className="bar-chart-horizontal">
            {sorted.map(opt => (
              <div key={opt.id || opt.option_text} className="bar-row">
                <span className="bar-label" title={opt.option_text}>{opt.option_text}</span>
                <div className="bar-wrapper">
                  <div className="bar" style={{ width: `${((opt.vote_count ?? 0) / maxVotes) * 100}%`, backgroundColor: opt.color }} />
                </div>
                <span className="bar-value">{opt.vote_count ?? 0}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="bar-chart-vertical">
            {sorted.map(opt => (
              <div key={opt.id || opt.option_text} className="bar-col">
                <div className="bar-wrapper">
                  <div className="bar" style={{ height: `${((opt.vote_count ?? 0) / maxVotes) * 200}px`, backgroundColor: opt.color }} />
                </div>
                <span className="bar-label" title={opt.option_text}>{opt.option_text}</span>
                <span className="bar-value">{opt.vote_count ?? 0}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import { useMemo, useRef } from "preact/hooks";
import { Award, Medal, Trophy } from "lucide-preact";
import DownloadButton from "./DownloadButton";

interface Props {
  options: Array<{ option_text: string; vote_count: number; color?: string }>;
  topCount: number;
  order: 'asc' | 'desc';
}

export default function TopList({ options, topCount, order }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  const totalVotes = useMemo(() => options.reduce((sum, o) => sum + (o.vote_count ?? 0), 0), [options]);
  const sorted = useMemo(
    () =>
      [...options]
        .sort((a, b) =>
          order === "desc"
            ? (b.vote_count ?? 0) - (a.vote_count ?? 0)
            : (a.vote_count ?? 0) - (b.vote_count ?? 0)
        )
        .slice(0, topCount),
    [options, topCount, order],
  );

  const rankIcon = (index: number) => {
    if (index === 0) return <Trophy className="rank-gold h-5 w-5" aria-hidden="true" />;
    if (index === 1) return <Medal className="rank-silver h-5 w-5" aria-hidden="true" />;
    if (index === 2) return <Award className="rank-bronze h-5 w-5" aria-hidden="true" />;
    return <span className="rank-number">{index + 1}</span>;
  };

  return (
    <div ref={containerRef} className="poll-top-list">
      <div className="poll-viz-toolbar top-list-header">
        <div className="poll-viz-title">Top {topCount}</div>
        <DownloadButton elementRef={containerRef} filename="top-list" type="list" />
      </div>

      <div className="top-list-items">
        {sorted.map((opt, index) => {
          const votes = opt.vote_count ?? 0;
          const pct = totalVotes > 0 ? (votes / totalVotes) * 100 : 0;
          const pctLabel = totalVotes > 0 ? `${pct.toFixed(1)}%` : "0%";

          return (
            <div key={opt.id ?? `${opt.option_text}-${index}`} className="top-list-item">
              <div className="top-list-rank">{rankIcon(index)}</div>
              <div className="top-list-content">
                <div className="top-list-text" title={opt.option_text}>{opt.option_text}</div>
                <div className="top-list-bar" aria-hidden="true">
                  <div
                    className="top-list-bar-fill"
                    style={{
                      width: `${pct}%`,
                      background: opt.color ?? "var(--color-accent-primary)",
                    }}
                  />
                </div>
              </div>
              <div className="top-list-stats">
                <div className="vote-count">{votes}</div>
                <div className="vote-percent">{pctLabel}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

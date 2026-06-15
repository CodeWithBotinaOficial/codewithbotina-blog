import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import DownloadButton from "./DownloadButton";
import { t, type SupportedLanguage } from "../../../lib/i18n";

interface Props {
  responses: string[];
  title?: string;
  language: SupportedLanguage;
}

type CloudWord = { text: string; value: number };
type LayoutWord = CloudWord & { x: number; y: number; rotate: number; size: number };

function buildWords(responses: string[]): CloudWord[] {
  const wordCount = new Map<string, number>();
  for (const raw of responses ?? []) {
    const response = String(raw ?? "").trim();
    if (!response) continue;
    const words = response
      .toLowerCase()
      .split(/\s+/g)
      .map((w) => w.replace(/[^\p{L}\p{N}_-]+/gu, ""))
      .filter((w) => w.length >= 3);
    for (const w of words) wordCount.set(w, (wordCount.get(w) ?? 0) + 1);
  }
  return Array.from(wordCount.entries())
    .map(([text, value]) => ({ text, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 120);
}

export default function WordCloud({ responses = [], title, language }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [layout, setLayout] = useState<LayoutWord[] | null>(null);
  const words = useMemo(() => buildWords(responses), [responses]);
  const chartTitle = title ?? t(language, "polls.results.wordCloud", "post");

  useEffect(() => {
    let cancelled = false;
    setLayout(null);
    if (!words.length) return;

    (async () => {
      // d3-cloud runs in the browser; avoid SSR issues by dynamic import.
      const mod = await import("d3-cloud");
      const cloudFactory = (mod as any).default ?? (mod as any);

      const width = 720;
      const height = 320;
      const max = Math.max(...words.map((w) => w.value), 1);
      const minFont = 12;
      const maxFont = 56;

      const cloud = cloudFactory()
        .size([width, height])
        .words(
          words.map((w) => ({
            ...w,
            size: Math.round(minFont + ((w.value / max) * (maxFont - minFont))),
          })),
        )
        .padding(2)
        .rotate(() => (Math.random() > 0.85 ? 90 : 0))
        .font("sans-serif")
        .fontSize((d: any) => d.size)
        .on("end", (out: any[]) => {
          if (cancelled) return;
          setLayout(out as LayoutWord[]);
        });

      cloud.start();
    })();

    return () => {
      cancelled = true;
    };
  }, [words]);

  // Render SVG centered at (0,0) for stable export.
  const width = 720;
  const height = 320;

  return (
    <div ref={containerRef} className="poll-wordcloud">
      <div className="poll-viz-toolbar">
        <DownloadButton elementRef={containerRef} filename="wordcloud" language={language} />
      </div>
      <div className="poll-viz-title">{chartTitle}</div>
      <div className="wordcloud-container" style={{ overflowX: "auto" }}>
        <svg
          width="100%"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label={chartTitle}
        >
          <rect x="0" y="0" width={width} height={height} fill="transparent" />
          <g transform={`translate(${width / 2},${height / 2})`}>
            {layout
              ? layout.map((w) => (
                <text
                  key={`${w.text}:${w.x}:${w.y}:${w.rotate}`}
                  text-anchor="middle"
                  transform={`translate(${w.x},${w.y}) rotate(${w.rotate})`}
                  style={{
                    fontSize: `${w.size}px`,
                    fontFamily: "var(--font-sans)",
                    fill: "var(--color-text-secondary)",
                  }}
                >
                  {w.text}
                </text>
              ))
              : (
                <text text-anchor="middle" style={{ fontSize: "14px", fill: "var(--color-text-tertiary)" }}>
                  {t(language, "polls.results.loading", "post")}
                </text>
              )}
          </g>
        </svg>
      </div>
    </div>
  );
}

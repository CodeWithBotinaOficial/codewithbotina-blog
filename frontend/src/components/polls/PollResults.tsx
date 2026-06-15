import { useEffect, useMemo, useState } from "preact/hooks";
import { BarChart3, List as ListIcon } from "lucide-preact";
import { t, type SupportedLanguage } from "../../lib/i18n";
import { pollsApi } from "../../lib/api";
import WordCloud from "./visualizations/WordCloud";
import TopList from "./visualizations/TopList";
import PollBarChart from "./visualizations/BarChart";

type ResultsTab = "chart" | "top";

export default function PollResults({ poll, userVote, language }: any) {
  const [results, setResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ResultsTab>("chart");
  const lang = (language ?? "en") as SupportedLanguage;
  const options = useMemo(
    () =>
      results?.options?.map((o: any) => ({
        id: o.id,
        option_text: o.option_text,
        vote_count: (() => {
          const raw = o.vote_count;
          const n = Array.isArray(raw)
            ? Number(raw?.[0]?.count ?? 0)
            : Number(raw ?? 0);
          return Number.isFinite(n) ? n : 0;
        })(),
        color: o.color ?? "var(--color-accent-primary)",
      })) ?? [],
    [results],
  );

  useEffect(() => {
    loadResults();
  }, [poll?.id, userVote]);

  useEffect(() => {
    // default tab preference based on settings
    const showChart = Boolean(poll?.poll_display_settings?.show_bar_chart);
    const showTop = Boolean(poll?.poll_display_settings?.show_top);
    setActiveTab(showChart ? "chart" : showTop ? "top" : "chart");
  }, [poll?.id]);

  async function loadResults() {
    try {
      const body = await pollsApi.results(poll.slug, language);
      setResults((body as any).data ?? body);
    } catch (err) {
      console.error("Failed to load results", err);
    }
  }

  if (!results) return <div className="poll-results-loading">{t(lang, "polls.results.loading", "post")}</div>;

  const settings = Array.isArray(poll?.poll_display_settings)
    ? (poll.poll_display_settings[0] ?? {})
    : (poll?.poll_display_settings ?? {});

  if (poll.type === "free_text") {
    const responses = results.freeTextResponses?.map((r: any) => r.free_text_response) ?? [];
    return (
      <div className="poll-results">
        <div className="poll-results-title">{t(lang, "polls.results.wordCloud", "post")}</div>
        {responses.length === 0 ? (
          <div className="poll-results-empty">{t(lang, "polls.results.empty", "post")}</div>
        ) : (
          <WordCloud responses={responses} title={t(lang, "polls.results.wordCloud", "post")} language={lang} />
        )}
      </div>
    );
  }

  const showChart = settings.show_bar_chart !== undefined ? Boolean(settings.show_bar_chart) : true;
  const showTop = Boolean(settings.show_top);
  const topCount = settings.top_count || Math.min(3, options.length);

  return (
    <div className="poll-results">
      <div className="poll-results-title">{t(lang, "polls.results.title", "post")}</div>

      {(showChart || showTop) ? (
        <div className="poll-tabs" role="tablist" aria-label={t(lang, "polls.results.viewsLabel", "post")}>
          {showChart ? (
            <button
              type="button"
              className={`poll-tab ${activeTab === "chart" ? "active" : ""}`}
              onClick={() => setActiveTab("chart")}
              role="tab"
              aria-selected={activeTab === "chart"}
            >
              <BarChart3 className="h-4 w-4" />
              {t(lang, "polls.results.chartTab", "post")}
            </button>
          ) : null}
          {showTop ? (
            <button
              type="button"
              className={`poll-tab ${activeTab === "top" ? "active" : ""}`}
              onClick={() => setActiveTab("top")}
              role="tab"
              aria-selected={activeTab === "top"}
            >
              <ListIcon className="h-4 w-4" />
              {t(lang, "polls.results.topTabLabel", "post", { count: topCount })}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="poll-viz-content">
        {activeTab === "top" && showTop ? (
          <TopList
            options={options}
            topCount={topCount}
            language={lang}
            // "Top" is expected to show the most-voted items. If an old poll has `asc` saved,
            // users perceive it as "not updating" because 0-vote options stay at the top.
            // Keep honoring `asc` only when there are no votes yet.
            order={(settings.top_order === "asc" && options.some((o) => o.vote_count > 0)) ? "desc" : (settings.top_order || "desc")}
          />
        ) : null}
        {activeTab === "chart" && showChart ? (
          <PollBarChart
            options={options}
            orientation={settings.bar_chart_orientation || "vertical"}
            optionsCount={settings.bar_chart_options_count || options.length}
            language={lang}
          />
        ) : null}
      </div>
    </div>
  );
}

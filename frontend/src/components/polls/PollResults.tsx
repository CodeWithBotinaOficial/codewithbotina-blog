import { useEffect, useMemo, useState } from "preact/hooks";
import { BarChart3, List as ListIcon } from "lucide-preact";
import { t, type SupportedLanguage } from "../../lib/i18n";
import { pollsApi } from "../../lib/api";
import WordCloud from "./visualizations/WordCloud";
import TopList from "./visualizations/TopList";
import PollBarChart from "./visualizations/BarChart";

type ResultsTab = "chart" | "top";

export default function PollResults({ poll, userVote: _userVote, language }: any) {
  const [results, setResults] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<ResultsTab>("chart");
  const lang = (language ?? "en") as SupportedLanguage;
  const options = useMemo(
    () =>
      results?.options?.map((o: any) => ({
        option_text: o.option_text,
        vote_count: o.vote_count ?? 0,
        color: o.color ?? "var(--color-accent-primary)",
      })) ?? [],
    [results],
  );

  useEffect(() => {
    loadResults();
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

  if (!results) return <div className="poll-results-loading">Loading results...</div>;

  const settings = Array.isArray(poll?.poll_display_settings)
    ? (poll.poll_display_settings[0] ?? {})
    : (poll?.poll_display_settings ?? {});

  if (poll.type === "free_text") {
    const responses = results.freeTextResponses?.map((r: any) => r.free_text_response) ?? [];
    return (
      <div className="poll-results">
        <div className="poll-results-title">{t(lang, "polls.results.wordCloud", "post")}</div>
        <WordCloud responses={responses} title={t(lang, "polls.results.wordCloud", "post")} />
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
        <div className="poll-tabs" role="tablist" aria-label="Results views">
          {showChart ? (
            <button
              type="button"
              className={`poll-tab ${activeTab === "chart" ? "active" : ""}`}
              onClick={() => setActiveTab("chart")}
              role="tab"
              aria-selected={activeTab === "chart"}
            >
              <BarChart3 className="h-4 w-4" />
              {t(lang, "polls.results.barChart", "post")}
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
              {t(lang, "polls.results.topList", "post", { count: topCount })}
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="poll-viz-content">
        {activeTab === "top" && showTop ? (
          <TopList options={options} topCount={topCount} order={settings.top_order || "desc"} />
        ) : null}
        {activeTab === "chart" && showChart ? (
          <PollBarChart
            options={options}
            orientation={settings.bar_chart_orientation || "vertical"}
            optionsCount={settings.bar_chart_options_count || options.length}
          />
        ) : null}
      </div>
    </div>
  );
}

import { useEffect, useState } from "preact/hooks";
import { ChevronDown, ChevronUp } from "lucide-preact";
import { t, type SupportedLanguage } from "../../../lib/i18n";
import { pollsApi } from "../../../lib/api";

interface Props {
  slug: string;
  language: string;
  pollLanguage?: string;
}

export default function PollAnalytics({ slug, language, pollLanguage }: Props) {
  const lang = (language ?? "en") as SupportedLanguage;
  const apiLanguage = pollLanguage ?? language;
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<any[] | null>(null);

  useEffect(() => {
    if (!open) return;
    if (rows) return;
    void load();
  }, [open]);

  async function load() {
    setLoading(true);
    try {
      const body = await pollsApi.analytics(slug, apiLanguage);
      setRows((body as any).data ?? body);
    } catch (_err) {
      // ignore
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="poll-analytics">
      <button
        type="button"
        className="btn-secondary"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {t(lang, "polls.analytics.title", "admin")}
      </button>

      {open ? (
        <div className="mt-3 overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
          {loading && !rows ? (
            <div className="p-4 text-sm text-[var(--color-text-secondary)]">{t(lang, "polls.loading", "admin")}</div>
          ) : rows && rows.length ? (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]">
                  <th className="border border-[var(--color-border)] px-3 py-2 text-left font-semibold">
                    {t(lang, "polls.analytics.user", "admin")}
                  </th>
                  <th className="border border-[var(--color-border)] px-3 py-2 text-left font-semibold">
                    {t(lang, "polls.analytics.vote", "admin")}
                  </th>
                  <th className="border border-[var(--color-border)] px-3 py-2 text-left font-semibold">
                    {t(lang, "polls.analytics.date", "admin")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const user = r.user ?? {};
                  const name = user.name || user.full_name || user.email || user.id || "—";
                  const vote = r.poll_option?.option_text || r.free_text_response || "—";
                  const date = r.voted_at ? new Date(r.voted_at).toLocaleString() : "—";
                  return (
                    <tr key={r.id}>
                      <td className="border border-[var(--color-border)] px-3 py-2">{name}</td>
                      <td className="border border-[var(--color-border)] px-3 py-2">{vote}</td>
                      <td className="border border-[var(--color-border)] px-3 py-2">{date}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="p-4 text-sm text-[var(--color-text-secondary)]">{t(lang, "polls.analytics.empty", "admin")}</div>
          )}
        </div>
      ) : null}
    </div>
  );
}

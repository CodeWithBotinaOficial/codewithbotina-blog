import { useEffect, useMemo, useState } from "preact/hooks";
import { Edit3, Lock, Plus, Trash2, Unlock } from "lucide-preact";
import { useSession } from "../../../hooks/useSession";
import { useToast } from "../../../hooks/useToast";
import { t, type SupportedLanguage } from "../../../lib/i18n";
import { getAdminPollTypeName, getPollStatusName } from "../../../lib/poll-i18n";
import { pollsApi } from "../../../lib/api";
import PollCreator from "./PollCreator";

interface Props {
  language: SupportedLanguage;
}

type LangFilter = SupportedLanguage | "all";

export default function PollManagement({ language }: Props) {
  const { isAdmin, loading: sessionLoading } = useSession();
  const { showToast } = useToast();
  const lang = (language ?? "en") as SupportedLanguage;
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);
  const [langFilter, setLangFilter] = useState<LangFilter>(language);

  const editBase = useMemo(() => `/${language}/admin/polls`, [language]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!isAdmin) return;
    void loadPolls();
  }, [sessionLoading, isAdmin, langFilter]);

  async function loadPolls() {
    setLoading(true);
    try {
      const body = await pollsApi.list({ language: langFilter === "all" ? undefined : langFilter, limit: 50 });
      setPolls((body as any).data ?? body);
    } catch (_err) {
      showToast(t(lang, "polls.loadFailed", "admin"), "error");
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(poll: any) {
    const newStatus = poll.status === "open" ? "closed" : "open";
    try {
      await pollsApi.update(poll.slug, poll.language ?? language, { status: newStatus });
      showToast(t(lang, "polls.statusUpdated", "admin", { status: getPollStatusName(lang, newStatus, "admin") }), "success");
      await loadPolls();
    } catch (_err) {
      showToast(t(lang, "polls.updateFailed", "admin"), "error");
    }
  }

  async function deletePoll(poll: any) {
    const confirmSlug = prompt(t(lang, "polls.confirmDeletePrompt", "admin", { slug: poll.slug }));
    if (confirmSlug !== poll.slug) return;
    try {
      await pollsApi.delete(poll.slug, poll.language ?? language);
      showToast(t(lang, "polls.pollDeleted", "admin"), "success");
      await loadPolls();
    } catch (_err) {
      showToast(t(lang, "polls.deleteFailed", "admin"), "error");
    }
  }

  if (sessionLoading) return <div class="text-sm text-[var(--color-text-secondary)]">{t(lang, "polls.loading", "admin")}</div>;
  if (!isAdmin) {
    return (
      <div class="rounded-xl border border-[var(--color-border)] bg-white p-6 text-sm text-[var(--color-text-secondary)]">
        {t(lang, "polls.adminOnly", "admin")}
      </div>
    );
  }

  return (
    <div class="space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-xl font-bold">{t(lang, "polls.title", "admin")}</h2>
          <p class="text-sm text-[var(--color-text-secondary)]">{t(lang, "polls.description", "admin")}</p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            class="input-field py-2"
            value={langFilter}
            onChange={(e) => setLangFilter((e.currentTarget as HTMLSelectElement).value as LangFilter)}
            aria-label={t(lang, "polls.createModal.language", "admin")}
          >
            <option value="all">{t(lang, "polls.filters.allLanguages", "admin")}</option>
            <option value="en">{t(lang, "polls.filters.english", "admin")}</option>
            <option value="es">{t(lang, "polls.filters.spanish", "admin")}</option>
            <option value="pt-br">{t(lang, "polls.filters.portuguese", "admin")}</option>
          </select>

          <button type="button" class="btn-primary inline-flex items-center gap-2" onClick={() => setShowCreator(true)}>
            <Plus className="h-4 w-4" />
            {t(lang, "polls.create", "admin")}
          </button>
        </div>
      </div>

      <div class="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
        <table class="w-full min-w-[860px] border-collapse text-sm">
          <thead class="bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]">
            <tr>
              <th class="border border-[var(--color-border)] px-3 py-2 text-left font-semibold">{t(lang, "polls.table.title", "admin")}</th>
              <th class="border border-[var(--color-border)] px-3 py-2 text-left font-semibold">{t(lang, "polls.table.slug", "admin")}</th>
              <th class="border border-[var(--color-border)] px-3 py-2 text-left font-semibold">{t(lang, "polls.table.language", "admin")}</th>
              <th class="border border-[var(--color-border)] px-3 py-2 text-left font-semibold">{t(lang, "polls.table.type", "admin")}</th>
              <th class="border border-[var(--color-border)] px-3 py-2 text-left font-semibold">{t(lang, "polls.table.status", "admin")}</th>
              <th class="border border-[var(--color-border)] px-3 py-2 text-left font-semibold">{t(lang, "polls.table.created", "admin")}</th>
              <th class="border border-[var(--color-border)] px-3 py-2 text-left font-semibold">{t(lang, "polls.table.actions", "admin")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td class="px-3 py-3 text-[var(--color-text-secondary)]" colSpan={7}>{t(lang, "polls.loading", "admin")}</td>
              </tr>
            ) : polls.length === 0 ? (
              <tr>
                <td class="px-3 py-3 text-[var(--color-text-secondary)]" colSpan={7}>{t(lang, "polls.empty", "admin")}</td>
              </tr>
            ) : polls.map((poll) => (
              <tr key={poll.id}>
                <td class="border border-[var(--color-border)] px-3 py-2 font-semibold text-[var(--color-text-primary)]">
                  {poll.title}
                </td>
                <td class="border border-[var(--color-border)] px-3 py-2 font-mono text-xs text-[var(--color-text-secondary)]">
                  {poll.slug}
                </td>
                <td class="border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-secondary)]">
                  {poll.language}
                </td>
                <td class="border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-secondary)]">
                  {getAdminPollTypeName(lang, poll.type)}
                </td>
                <td class="border border-[var(--color-border)] px-3 py-2">
                  <span class={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${poll.status === "open" ? "bg-[var(--color-accent-light)] text-[var(--color-accent-primary)]" : "bg-gray-100 text-gray-700"}`}>
                    {getPollStatusName(lang, poll.status, "admin")}
                  </span>
                </td>
                <td class="border border-[var(--color-border)] px-3 py-2 text-[var(--color-text-secondary)]">
                  {poll.created_at ? new Date(poll.created_at).toLocaleDateString() : "—"}
                </td>
                <td class="border border-[var(--color-border)] px-3 py-2">
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="btn-secondary px-3 py-2"
                      onClick={() => toggleStatus(poll)}
                      title={poll.status === "open" ? t(lang, "polls.actions.close", "admin") : t(lang, "polls.actions.open", "admin")}
                    >
                      {poll.status === "open" ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </button>

                    <a
                      class="btn-secondary px-3 py-2"
                      href={`${editBase}/${encodeURIComponent(poll.slug)}/edit?lang=${encodeURIComponent(poll.language ?? language)}`}
                      title={t(lang, "polls.actions.edit", "admin")}
                    >
                      <Edit3 className="h-4 w-4" />
                    </a>

                    <button type="button" class="btn-secondary px-3 py-2" onClick={() => deletePoll(poll)} title={t(lang, "polls.actions.delete", "admin")}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <PollCreator
        isOpen={showCreator}
        onClose={() => setShowCreator(false)}
        language={langFilter === "all" ? language : langFilter}
        onPollCreated={() => loadPolls()}
      />
    </div>
  );
}

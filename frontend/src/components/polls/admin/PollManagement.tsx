import { useEffect, useMemo, useState } from "preact/hooks";
import { Edit3, Lock, Plus, Trash2, Unlock } from "lucide-preact";
import { useSession } from "../../../hooks/useSession";
import { useToast } from "../../../hooks/useToast";
import type { SupportedLanguage } from "../../../lib/i18n";
import PollCreator from "./PollCreator";

interface Props {
  language: SupportedLanguage;
}

type LangFilter = SupportedLanguage | "all";

export default function PollManagement({ language }: Props) {
  const { isAdmin, loading: sessionLoading } = useSession();
  const { showToast } = useToast();
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
      const url = new URL("/api/polls", window.location.origin);
      if (langFilter !== "all") url.searchParams.set("language", langFilter);
      url.searchParams.set("limit", "50");
      const res = await fetch(url.toString(), { credentials: "include" });
      if (!res.ok) throw new Error("Failed to load polls");
      const body = await res.json();
      setPolls(body.data ?? body);
    } catch (_err) {
      showToast("Failed to load polls", "error");
    } finally {
      setLoading(false);
    }
  }

  async function toggleStatus(poll: any) {
    const newStatus = poll.status === "open" ? "closed" : "open";
    try {
      const res = await fetch(`/api/polls/${encodeURIComponent(poll.slug)}/update?lang=${encodeURIComponent(poll.language ?? language)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed to update poll");
      showToast(`Poll ${newStatus}`, "success");
      await loadPolls();
    } catch (_err) {
      showToast("Failed to update poll", "error");
    }
  }

  async function deletePoll(poll: any) {
    const confirmSlug = prompt(`Type "${poll.slug}" to confirm deletion:`);
    if (confirmSlug !== poll.slug) return;
    try {
      const res = await fetch(`/api/polls/${encodeURIComponent(poll.slug)}/delete?lang=${encodeURIComponent(poll.language ?? language)}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete poll");
      showToast("Poll deleted", "success");
      await loadPolls();
    } catch (_err) {
      showToast("Failed to delete poll", "error");
    }
  }

  if (sessionLoading) return <div class="text-sm text-[var(--color-text-secondary)]">Loading…</div>;
  if (!isAdmin) {
    return (
      <div class="rounded-xl border border-[var(--color-border)] bg-white p-6 text-sm text-[var(--color-text-secondary)]">
        Admin only.
      </div>
    );
  }

  return (
    <div class="space-y-4">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 class="text-xl font-bold">Polls</h2>
          <p class="text-sm text-[var(--color-text-secondary)]">Manage polls across languages.</p>
        </div>

        <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
          <select
            class="input-field py-2"
            value={langFilter}
            onChange={(e) => setLangFilter((e.currentTarget as HTMLSelectElement).value as LangFilter)}
            aria-label="Language filter"
          >
            <option value="all">All languages</option>
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="pt-br">Português (BR)</option>
          </select>

          <button type="button" class="btn-primary inline-flex items-center gap-2" onClick={() => setShowCreator(true)}>
            <Plus className="h-4 w-4" />
            Create Poll
          </button>
        </div>
      </div>

      <div class="overflow-x-auto rounded-xl border border-[var(--color-border)] bg-white">
        <table class="w-full min-w-[860px] border-collapse text-sm">
          <thead class="bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]">
            <tr>
              <th class="border border-[var(--color-border)] px-3 py-2 text-left font-semibold">Title</th>
              <th class="border border-[var(--color-border)] px-3 py-2 text-left font-semibold">Slug</th>
              <th class="border border-[var(--color-border)] px-3 py-2 text-left font-semibold">Lang</th>
              <th class="border border-[var(--color-border)] px-3 py-2 text-left font-semibold">Type</th>
              <th class="border border-[var(--color-border)] px-3 py-2 text-left font-semibold">Status</th>
              <th class="border border-[var(--color-border)] px-3 py-2 text-left font-semibold">Created</th>
              <th class="border border-[var(--color-border)] px-3 py-2 text-left font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td class="px-3 py-3 text-[var(--color-text-secondary)]" colSpan={7}>Loading…</td>
              </tr>
            ) : polls.length === 0 ? (
              <tr>
                <td class="px-3 py-3 text-[var(--color-text-secondary)]" colSpan={7}>No polls.</td>
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
                  {poll.type}
                </td>
                <td class="border border-[var(--color-border)] px-3 py-2">
                  <span class={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${poll.status === "open" ? "bg-[var(--color-accent-light)] text-[var(--color-accent-primary)]" : "bg-gray-100 text-gray-700"}`}>
                    {poll.status}
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
                      title={poll.status === "open" ? "Close" : "Open"}
                    >
                      {poll.status === "open" ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
                    </button>

                    <a
                      class="btn-secondary px-3 py-2"
                      href={`${editBase}/${encodeURIComponent(poll.slug)}/edit?lang=${encodeURIComponent(poll.language ?? language)}`}
                      title="Edit"
                    >
                      <Edit3 className="h-4 w-4" />
                    </a>

                    <button type="button" class="btn-secondary px-3 py-2" onClick={() => deletePoll(poll)} title="Delete">
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

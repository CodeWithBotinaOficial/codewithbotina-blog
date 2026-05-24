import { useEffect, useMemo, useState } from "preact/hooks";
import { Plus, Save, Trash2 } from "lucide-preact";
import { useSession } from "../../../hooks/useSession";
import { useToast } from "../../../hooks/useToast";
import type { SupportedLanguage } from "../../../lib/i18n";
import PollAnalytics from "./PollAnalytics";
import { pollsApi } from "../../../lib/api";

interface Props {
  slug: string;
  pollLanguage: SupportedLanguage;
}

export default function PollEditor({ slug, pollLanguage }: Props) {
  const { isAdmin, loading: sessionLoading } = useSession();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [poll, setPoll] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"open" | "closed">("open");
  const [closesAt, setClosesAt] = useState<string>("");

  const [newOptionText, setNewOptionText] = useState("");
  const [addingOption, setAddingOption] = useState(false);

  const opts = useMemo(() => poll?.poll_options ?? [], [poll]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!isAdmin) return;
    void load();
  }, [sessionLoading, isAdmin, slug, pollLanguage]);

  async function load() {
    setLoading(true);
    try {
      const body = await pollsApi.get(slug, pollLanguage);
      const p = (body as any).data ?? body;
      setPoll(p);
      setTitle(String(p.title ?? ""));
      setDescription(String(p.description ?? ""));
      setStatus((p.status ?? "open") as any);
      setClosesAt(p.closes_at ? toLocalInputValue(p.closes_at) : "");
    } catch (_err) {
      setPoll(null);
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    if (!poll) return;
    setSaving(true);
    try {
      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        status,
        closes_at: closesAt ? new Date(closesAt).toISOString() : null,
      };
      await pollsApi.update(slug, pollLanguage, payload);
      showToast("Saved", "success");
      await load();
    } catch (_err) {
      showToast("Failed to save", "error");
    } finally {
      setSaving(false);
    }
  }

  async function addOption() {
    if (!poll) return;
    const text = newOptionText.trim();
    if (!text) return;
    setAddingOption(true);
    try {
      await pollsApi.addOption(slug, pollLanguage, { option_text: text });
      setNewOptionText("");
      showToast("Option added", "success");
      await load();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add option", "error");
    } finally {
      setAddingOption(false);
    }
  }

  async function deleteOption(optionId: string) {
    if (!confirm("Delete this option?")) return;
    try {
      await pollsApi.deleteOption(slug, pollLanguage, optionId);
      showToast("Option deleted", "success");
      await load();
    } catch (_err) {
      showToast("Failed to delete option", "error");
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

  if (loading) return <div class="text-sm text-[var(--color-text-secondary)]">Loading poll…</div>;
  if (!poll) return <div class="rounded-xl border border-[var(--color-border)] bg-white p-6 text-sm">Poll not found.</div>;

  return (
    <div class="space-y-6">
      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold">Edit Poll</h1>
          <p class="text-sm text-[var(--color-text-secondary)]">
            <span class="font-mono text-xs">{poll.slug}</span> · {poll.language} · {poll.type}
          </p>
        </div>
        <button type="button" class="btn-primary inline-flex items-center gap-2" onClick={save} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? "Saving..." : "Save"}
        </button>
      </div>

      <div class="grid grid-cols-1 gap-4 rounded-xl border border-[var(--color-border)] bg-white p-5 md:grid-cols-2">
        <div class="space-y-2 md:col-span-2">
          <label class="text-sm font-semibold">Title</label>
          <input class="input-field" value={title} onInput={(e) => setTitle((e.currentTarget as HTMLInputElement).value)} />
        </div>

        <div class="space-y-2 md:col-span-2">
          <label class="text-sm font-semibold">Description</label>
          <textarea
            class="input-field"
            rows={3}
            value={description}
            onInput={(e) => setDescription((e.currentTarget as HTMLTextAreaElement).value)}
          />
        </div>

        <div class="space-y-2">
          <label class="text-sm font-semibold">Status</label>
          <select class="input-field" value={status} onChange={(e) => setStatus((e.currentTarget as HTMLSelectElement).value as any)}>
            <option value="open">open</option>
            <option value="closed">closed</option>
          </select>
        </div>

        <div class="space-y-2">
          <label class="text-sm font-semibold">Closes At</label>
          <input
            class="input-field"
            type="datetime-local"
            value={closesAt}
            onInput={(e) => setClosesAt((e.currentTarget as HTMLInputElement).value)}
          />
          <div class="text-xs text-[var(--color-text-tertiary)]">Leave blank for no auto-close.</div>
        </div>
      </div>

      {poll.type !== "free_text" ? (
        <div class="rounded-xl border border-[var(--color-border)] bg-white p-5">
          <h2 class="text-lg font-bold mb-3">Options</h2>

          <div class="space-y-2">
            {opts.map((o: any) => (
              <div key={o.id} class="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] px-4 py-3">
                <div class="min-w-0">
                  <div class="truncate font-semibold text-[var(--color-text-primary)]">{o.option_text}</div>
                  <div class="text-xs text-[var(--color-text-tertiary)]">order: {o.display_order}</div>
                </div>
                <button type="button" class="btn-secondary px-3 py-2" onClick={() => deleteOption(o.id)} title="Delete option">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div class="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              class="input-field flex-1"
              placeholder="New option text"
              value={newOptionText}
              onInput={(e) => setNewOptionText((e.currentTarget as HTMLInputElement).value)}
            />
            <button type="button" class="btn-primary inline-flex items-center gap-2" onClick={addOption} disabled={!newOptionText.trim() || addingOption}>
              <Plus className="h-4 w-4" />
              {addingOption ? "Adding..." : "Add option"}
            </button>
          </div>
        </div>
      ) : null}

      <div class="rounded-xl border border-[var(--color-border)] bg-white p-5">
        <h2 class="text-lg font-bold mb-2">Embed</h2>
        <div class="text-sm text-[var(--color-text-secondary)]">
          Use this in Markdown:
          <pre class="mt-2 rounded-lg bg-[var(--color-bg-subtle)] p-3 text-xs overflow-x-auto"><code>[{poll.title}](poll:{poll.slug})</code></pre>
        </div>
      </div>

      <PollAnalytics slug={slug} language={pollLanguage} />
    </div>
  );
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

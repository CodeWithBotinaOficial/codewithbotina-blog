import { useEffect, useMemo, useState } from "preact/hooks";
import { Copy, Plus, Search } from "lucide-preact";
import Modal from "../../ui/Modal";
import { pollsApi } from "../../../lib/api";
import { t, type SupportedLanguage } from "../../../lib/i18n";
import { useToast } from "../../../hooks/useToast";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentLanguage: SupportedLanguage;
  onCreatePoll?: () => void;
}

async function writeToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const el = document.createElement("textarea");
  el.value = text;
  el.setAttribute("readonly", "true");
  el.style.position = "fixed";
  el.style.left = "-9999px";
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
}

export default function PollsBrowser({ isOpen, onClose, currentLanguage, onCreatePoll }: Props) {
  const { showToast } = useToast();
  const lang = (currentLanguage ?? "en") as SupportedLanguage;
  const [polls, setPolls] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    void load();
  }, [isOpen]);

  async function load() {
    setLoading(true);
    try {
      const body = await pollsApi.list({ limit: 200 });
      setPolls((body as any).data ?? body);
    } catch (_err) {
      showToast("Failed to load polls", "error");
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return polls;
    return polls.filter((p) => String(p.title ?? "").toLowerCase().includes(q) || String(p.slug ?? "").toLowerCase().includes(q));
  }, [polls, search]);

  const copyCode = async (poll: any) => {
    const title = String(poll?.title ?? "Poll").trim() || "Poll";
    const slug = String(poll?.slug ?? "").trim();
    if (!slug) return;
    const code = `[${title}](poll:${slug})`;
    try {
      await writeToClipboard(code);
      setCopiedId(String(poll.id ?? slug));
      showToast(code, "success");
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch (_err) {
      showToast("Failed to copy", "error");
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t(lang, "pollsBrowser.title", "post")}
      maxWidthClass="max-w-2xl"
      footer={(
        <>
          {onCreatePoll ? (
            <button type="button" class="btn-secondary inline-flex items-center gap-2" onClick={onCreatePoll}>
              <Plus className="h-4 w-4" />
              {t(lang, "polls.create", "admin")}
            </button>
          ) : null}
          <button type="button" class="btn-primary" onClick={onClose}>
            {t(lang, "pollsBrowser.close", "post")}
          </button>
        </>
      )}
    >
      <div class="space-y-4">
        <div class="flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-3 py-2">
          <Search className="h-4 w-4 text-[var(--color-text-tertiary)]" />
          <input
            class="w-full bg-transparent outline-none text-sm text-[var(--color-text-primary)]"
            type="text"
            value={search}
            onInput={(e) => setSearch(String((e.currentTarget as HTMLInputElement).value ?? ""))}
            placeholder={t(lang, "pollsBrowser.search", "post")}
          />
        </div>

        <div class="max-h-[420px] overflow-y-auto space-y-2 pr-1">
          {loading ? (
            <div class="py-10 text-center text-sm text-[var(--color-text-secondary)]">{t(lang, "pollsBrowser.loading", "post")}</div>
          ) : filtered.length === 0 ? (
            <div class="py-10 text-center text-sm text-[var(--color-text-secondary)]">{t(lang, "pollsBrowser.noPolls", "post")}</div>
          ) : (
            filtered.map((poll) => (
              <div key={poll.id} class="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-border)] bg-white px-4 py-3">
                <div class="min-w-0">
                  <div class="truncate font-semibold text-[var(--color-text-primary)]">{poll.title}</div>
                  <div class="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-text-tertiary)]">
                    <span class="font-mono">{poll.slug}</span>
                    <span class="rounded-full bg-[var(--color-bg-subtle)] px-2 py-0.5">{poll.type}</span>
                    <span class="rounded-full bg-[var(--color-bg-subtle)] px-2 py-0.5">{poll.language}</span>
                  </div>
                </div>

                <button
                  type="button"
                  class={`btn-secondary inline-flex items-center gap-2 shrink-0 ${copiedId === String(poll.id ?? "") ? "border-green-300 text-green-700" : ""}`}
                  onClick={() => copyCode(poll)}
                >
                  <Copy className="h-4 w-4" />
                  {copiedId === String(poll.id ?? "") ? t(lang, "pollsBrowser.copied", "post") : t(lang, "pollsBrowser.copyCode", "post")}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </Modal>
  );
}

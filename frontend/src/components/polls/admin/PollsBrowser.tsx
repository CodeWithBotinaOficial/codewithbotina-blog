import { useEffect, useMemo, useState } from "preact/hooks";
import { Copy, Globe, Plus, Search } from "lucide-preact";
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
    const pollLang = String(poll?.language ?? "").trim();
    if (!slug) return;
    
    // Generate code with explicit language parameter
    const code = pollLang ? `[${title}](poll:${slug}|${pollLang})` : `[${title}](poll:${slug})`;
    
    try {
      await writeToClipboard(code);
      setCopiedId(String(poll.id ?? slug));
      showToast(code, "success");
      window.setTimeout(() => setCopiedId(null), 2000);
    } catch (_err) {
      showToast("Failed to copy", "error");
    }
  };

  const getLanguageLabel = (l: string) => {
    switch (l) {
      case 'en': return '🇺🇸 English';
      case 'es': return '🇪🇸 Español';
      case 'pt-br': return '🇧🇷 Português';
      default: return l.toUpperCase();
    }
  };

  const getLanguageColor = (l: string) => {
    switch (l) {
      case 'en': return 'bg-blue-100 text-blue-700';
      case 'es': return 'bg-pink-100 text-pink-700';
      case 'pt-br': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-gray-100 text-gray-700';
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
                  <div class="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    <span class="font-mono text-[var(--color-text-tertiary)]">{poll.slug}</span>
                    <span class="rounded-full bg-[var(--color-bg-subtle)] px-2 py-0.5 text-[var(--color-text-tertiary)]">{poll.type}</span>
                    <span class={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-medium ${getLanguageColor(poll.language)}`}>
                      <Globe className="h-3 w-3" />
                      {getLanguageLabel(poll.language)}
                    </span>
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

        <div class="rounded-lg bg-blue-50 p-4 text-xs text-blue-800">
          💡 <strong>Tip:</strong> You can embed polls from any language into any post. The poll will always display in its native language.
        </div>
      </div>
    </Modal>
  );
}

import { BarChart3, PlusCircle } from "lucide-preact";
import { useSession } from "../../hooks/useSession";
import { t, type SupportedLanguage } from "../../lib/i18n";

interface Props {
  language?: string;
  label?: string;
}

export default function AdminCreatePostButton({ language, label }: Props) {
  const { isAdmin, loading } = useSession();
  const lang = (language ?? "en") as SupportedLanguage;

  if (loading || !isAdmin) return null;

  const createHref = language
    ? `/${language}/admin/create-post`
    : "/admin/create-post";

  const managePollsHref = language
    ? `/${language}/admin/polls`
    : "/admin/polls";

  return (
    <div class="my-10 flex justify-center gap-4">
      <a
        href={createHref}
        class="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-accent-hover)]"
      >
        <PlusCircle className="h-5 w-5" />
        {label ?? t(lang, "createPost", "admin")}
      </a>
      <a
        href={managePollsHref}
        class="inline-flex items-center gap-2 rounded-lg border border-[var(--color-border)] bg-white px-6 py-3 font-semibold text-[var(--color-text-secondary)] shadow-sm transition-colors hover:bg-[var(--color-bg-subtle)]"
        title={t(lang, "managePoll", "admin")}
      >
        <BarChart3 className="h-5 w-5" />
        {t(lang, "managePoll", "admin")}
      </a>
    </div>
  );
}

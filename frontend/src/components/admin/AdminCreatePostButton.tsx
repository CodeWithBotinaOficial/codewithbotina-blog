import { PlusCircle } from "lucide-preact";
import { useSession } from "../../hooks/useSession";

interface Props {
  language?: string;
  label?: string;
}

export default function AdminCreatePostButton({ language, label }: Props) {
  const { isAdmin, loading } = useSession();

  if (loading || !isAdmin) return null;

  const href = language
    ? `/${language}/admin/create-post`
    : "/admin/create-post";

  return (
    <div class="my-10 flex justify-center">
      <a
        href={href}
        class="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-accent-hover)]"
      >
        <PlusCircle className="h-5 w-5" />
        {label ?? "Create New Post"}
      </a>
    </div>
  );
}

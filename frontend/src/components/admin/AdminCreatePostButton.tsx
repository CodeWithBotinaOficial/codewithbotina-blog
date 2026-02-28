import { useSession } from "../../hooks/useSession";

export default function AdminCreatePostButton() {
  const { isAdmin, loading } = useSession();

  if (loading || !isAdmin) return null;

  return (
    <div class="my-10 flex justify-center">
      <a
        href="/admin/create-post"
        class="inline-flex items-center gap-2 rounded-lg bg-[var(--color-accent-primary)] px-6 py-3 font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-accent-hover)]"
      >
        ➕ Create New Post
      </a>
    </div>
  );
}

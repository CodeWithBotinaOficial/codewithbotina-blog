import { useEffect, useRef, useState } from "preact/hooks";
import { getApiUrl } from "../../lib/env";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../hooks/useSession";

interface Props {
  slug: string;
  titulo: string;
}

const API_URL = getApiUrl();

export default function AdminPostMenu({ slug, titulo }: Props) {
  const { isAdmin, loading } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [deleteInfo, setDeleteInfo] = useState<{
    comments_count: number;
    likes_count: number;
    dislikes_count: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (event: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [isOpen]);

  if (loading || !isAdmin) return null;

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  };

  const fetchDeleteInfo = async () => {
    const token = await getAccessToken();
    if (!token) throw new Error("Missing access token");

    const response = await fetch(
      `${API_URL}/api/posts/${slug}/delete`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error("Failed to load delete info");
    }

    const body = await response.json();
    return body?.data;
  };

  const handleDeleteClick = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    setIsOpen(false);

    try {
      const info = await fetchDeleteInfo();
      setDeleteInfo({
        comments_count: info?.comments_count ?? 0,
        likes_count: info?.likes_count ?? 0,
        dislikes_count: info?.dislikes_count ?? 0,
      });
      setShowDialog(true);
    } catch (error) {
      console.error(error);
      alert("Failed to load delete confirmation. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const confirmDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Missing access token");

      const response = await fetch(
        `${API_URL}/api/posts/${slug}/delete?confirm=true`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to delete post");
      }

      alert("Post deleted successfully");
      window.location.href = "/";
    } catch (error) {
      console.error(error);
      alert("Failed to delete post. Please try again.");
    } finally {
      setIsDeleting(false);
      setShowDialog(false);
    }
  };

  return (
    <div class="relative ml-auto" ref={menuRef}>
      <button
        type="button"
        class="rounded-full border border-[var(--color-border)] bg-white px-3 py-2 text-xl shadow-sm transition hover:bg-[var(--color-bg-subtle)]"
        aria-label="Admin actions"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        ⋮
      </button>

      {isOpen ? (
        <div class="absolute right-0 mt-2 w-44 rounded-xl border border-[var(--color-border)] bg-white shadow-lg">
          <a
            href={`/admin/edit-post/${slug}`}
            class="block px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
          >
            ✏️ Edit Post
          </a>
          <button
            type="button"
            class="block w-full px-4 py-2 text-left text-sm text-[var(--color-error)] hover:bg-[var(--color-bg-subtle)]"
            onClick={handleDeleteClick}
            disabled={isDeleting}
          >
            {isDeleting ? "Deleting..." : "🗑️ Delete Post"}
          </button>
        </div>
      ) : null}

      {showDialog && deleteInfo ? (
        <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div class="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h2 class="text-xl font-bold text-[var(--color-error)]">
              ⚠️ Delete Post?
            </h2>
            <p class="mt-4 text-sm text-[var(--color-text-secondary)]">
              This action cannot be undone. Deleting this post will permanently remove:
            </p>
            <ul class="mt-3 space-y-1 text-sm text-[var(--color-text-secondary)]">
              <li>- The post content</li>
              <li>- All comments ({deleteInfo.comments_count} comments)</li>
              <li>
                - All reactions ({deleteInfo.likes_count} likes,{" "}
                {deleteInfo.dislikes_count} dislikes)
              </li>
              <li>- Associated images</li>
            </ul>
            <p class="mt-4 text-sm font-semibold">
              Are you sure you want to delete "{titulo}"?
            </p>
            <div class="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                class="rounded-lg border border-[var(--color-border)] px-4 py-2 text-sm font-semibold text-[var(--color-text-secondary)] hover:border-[var(--color-text-primary)]"
                onClick={() => setShowDialog(false)}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                type="button"
                class="rounded-lg bg-[var(--color-error)] px-4 py-2 text-sm font-semibold text-white hover:bg-[#b71c1c]"
                onClick={confirmDelete}
                disabled={isDeleting}
              >
                {isDeleting ? "Deleting..." : "Delete Permanently"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

import { useEffect, useRef, useState } from "preact/hooks";
import { MoreVertical, Pencil, Trash2 } from "lucide-preact";
import { getApiUrl } from "../../lib/env";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../hooks/useSession";
import ConfirmDialog from "../ui/ConfirmDialog";
import Toast from "../ui/Toast";
import { useToast } from "../../hooks/useToast";

interface Props {
  slug: string;
  titulo: string;
  language?: string;
  labels?: {
    edit: string;
    delete: string;
    deleting: string;
    deleteSuccess: string;
    deleteError: string;
    deleteLoadError: string;
    deleteConfirmTitle: string;
    deleteConfirmMessage: string;
    confirmText: string;
    cancelText: string;
  };
}

const API_URL = getApiUrl();

export default function AdminPostMenu({ slug, titulo, language, labels }: Props) {
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
  const { toasts, showToast, removeToast } = useToast();

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

  const defaultLabels = {
    edit: "Edit Post",
    delete: "Delete Post",
    deleting: "Deleting...",
    deleteSuccess: "Post deleted successfully.",
    deleteError: "Failed to delete post. Please try again.",
    deleteLoadError: "Failed to load delete confirmation. Please try again.",
    deleteConfirmTitle: "Delete post?",
    deleteConfirmMessage:
      "This will permanently remove \"{{title}}\" and delete {{comments}} comments, {{likes}} likes, and {{dislikes}} dislikes.",
    confirmText: "Delete",
    cancelText: "Cancel",
  };

  const mergedLabels = { ...defaultLabels, ...(labels ?? {}) };

  const formatTemplate = (template: string, data: Record<string, string | number>) => {
    return Object.entries(data).reduce((acc, [key, value]) => {
      return acc.replace(new RegExp(`{{\\s*${key}\\s*}}`, "g"), String(value));
    }, template);
  };

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  };

  const fetchDeleteInfo = async () => {
    const token = await getAccessToken();
    if (!token) throw new Error("Missing access token");

    const query = language ? `?language=${encodeURIComponent(language)}` : "";
    const response = await fetch(
      `${API_URL}/api/posts/${slug}/delete${query}`,
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
      showToast(mergedLabels.deleteLoadError, "error");
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

      const query = language ? `?language=${encodeURIComponent(language)}&confirm=true` : "?confirm=true";
      const response = await fetch(
        `${API_URL}/api/posts/${slug}/delete${query}`,
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

      showToast(mergedLabels.deleteSuccess, "success");
      window.setTimeout(() => {
        window.location.href = language ? `/${language}/` : "/";
      }, 600);
    } catch (error) {
      console.error(error);
      showToast(mergedLabels.deleteError, "error");
    } finally {
      setIsDeleting(false);
      setShowDialog(false);
    }
  };

  return (
    <div class="relative ml-auto" ref={menuRef}>
      <button
        type="button"
        class="rounded-full border border-[var(--color-border)] bg-white p-2 shadow-sm transition hover:bg-[var(--color-bg-subtle)]"
        aria-label="Admin actions"
        onClick={() => setIsOpen((prev) => !prev)}
      >
        <MoreVertical className="h-5 w-5 text-[var(--color-text-secondary)]" />
      </button>

      {isOpen ? (
        <div class="absolute right-0 mt-2 w-44 rounded-xl border border-[var(--color-border)] bg-white shadow-lg">
          <a
            href={`/admin/edit-post/${slug}${language ? `?lang=${encodeURIComponent(language)}` : ""}`}
            class="flex items-center gap-2 px-4 py-2 text-sm text-[var(--color-text-primary)] hover:bg-[var(--color-bg-subtle)]"
          >
            <Pencil className="h-4 w-4" />
            {mergedLabels.edit}
          </a>
          <button
            type="button"
            class="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-[var(--color-error)] hover:bg-[var(--color-bg-subtle)]"
            onClick={handleDeleteClick}
            disabled={isDeleting}
          >
            <Trash2 className="h-4 w-4" />
            {isDeleting ? mergedLabels.deleting : mergedLabels.delete}
          </button>
        </div>
      ) : null}

      <ConfirmDialog
        isOpen={showDialog}
        onClose={() => setShowDialog(false)}
        onConfirm={confirmDelete}
        title={mergedLabels.deleteConfirmTitle}
        message={formatTemplate(mergedLabels.deleteConfirmMessage, {
          title: titulo,
          comments: deleteInfo?.comments_count ?? 0,
          likes: deleteInfo?.likes_count ?? 0,
          dislikes: deleteInfo?.dislikes_count ?? 0,
        })}
        confirmText={isDeleting ? mergedLabels.deleting : mergedLabels.confirmText}
        cancelText={mergedLabels.cancelText}
        variant="danger"
      />

      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
    </div>
  );
}

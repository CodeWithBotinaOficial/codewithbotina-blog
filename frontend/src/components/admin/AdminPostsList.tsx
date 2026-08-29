import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import { Calendar, Clock, Eye, Edit, Trash2, AlertCircle, ChevronDown } from "lucide-preact";
import { t, type SupportedLanguage } from "../../lib/i18n";
import { getAdminRoute } from "../../lib/admin-endpoints";

interface Post {
  id: string;
  titulo: string;
  slug: string;
  fecha?: string;
  created_at?: string;
  updated_at?: string;
  status?: string;
  scheduled_at?: string | null;
  language?: string;
  imagen_url?: string | null;
}

interface Props {
  posts: Post[];
  currentLanguage: SupportedLanguage;
}

interface CountdownState {
  [key: string]: string;
}

const ADMIN_API = getAdminRoute("");

function getCountdownValue(post: Post, now = new Date()): string | null {
  if (post.status !== "scheduled" || !post.scheduled_at) return null;

  const scheduledDate = new Date(post.scheduled_at);
  const diffMs = scheduledDate.getTime() - now.getTime();

  if (diffMs <= 0) {
    return "Publishing...";
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  if (days > 0) {
    return `${days}d ${hours}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

export default function AdminPostsList({ posts, currentLanguage }: Props) {
  const [countdowns, setCountdowns] = useState<CountdownState>(() => {
    const initial: CountdownState = {};
    for (const post of posts) {
      const value = getCountdownValue(post);
      if (value) initial[post.id] = value;
    }
    return initial;
  });
  const [expandedPost, setExpandedPost] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const countdownRef = useRef<number | null>(null);

  useEffect(() => {
    const updateCountdowns = () => {
      const now = new Date();
      const newCountdowns: CountdownState = {};

      for (const post of posts) {
        const value = getCountdownValue(post, now);
        if (value) newCountdowns[post.id] = value;
      }

      setCountdowns(newCountdowns);
    };

    updateCountdowns();
    countdownRef.current = window.setInterval(updateCountdowns, 1000);

    return () => {
      if (countdownRef.current !== null) {
        window.clearInterval(countdownRef.current);
      }
    };
  }, [posts]);

  const handleDeletePost = async (slug: string) => {
    if (isDeleting) return;

    try {
      setIsDeleting(true);
      const response = await fetch(`${ADMIN_API}/posts/${encodeURIComponent(slug)}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Failed to delete post");
      }

      // Reload page to refresh list
      window.location.reload();
    } catch (error) {
      console.error("Error deleting post:", error);
      alert("Failed to delete post. Please try again.");
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const formatDate = (dateString: string | undefined): string => {
    if (!dateString) return "Unknown date";

    const date = new Date(dateString);
    const locale = currentLanguage === "pt-br" ? "pt-BR" : currentLanguage === "es" ? "es-ES" : "en-US";

    return new Intl.DateTimeFormat(locale, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const getStatusBadge = (post: Post) => {
    if (post.status === "scheduled") {
      return (
        <div class="inline-flex items-center gap-2 rounded-full bg-[var(--color-warning)]/10 px-3 py-1.5 text-sm font-medium text-[var(--color-warning)]">
          <Clock size={16} />
          <span>{t(currentLanguage, "scheduling.label", "admin")}</span>
          {countdowns[post.id] && (
            <span class="ml-1 font-mono text-xs opacity-80">{countdowns[post.id]}</span>
          )}
        </div>
      );
    }

    if (post.status === "published") {
      return (
        <div class="inline-flex items-center gap-2 rounded-full bg-[var(--color-success)]/10 px-3 py-1.5 text-sm font-medium text-[var(--color-success)]">
          <Eye size={16} />
          <span>Published</span>
        </div>
      );
    }

    return (
      <div class="inline-flex items-center gap-2 rounded-full bg-[var(--color-neutral)]/10 px-3 py-1.5 text-sm font-medium text-[var(--color-text-secondary)]">
        <AlertCircle size={16} />
        <span>Draft</span>
      </div>
    );
  };

  const groupedPosts = useMemo(() => {
    const groups: Record<string, Post[]> = {
      scheduled: [],
      published: [],
      draft: [],
    };

    for (const post of posts) {
      const status = post.status || "draft";
      if (status === "scheduled") {
        groups.scheduled.push(post);
      } else if (status === "published") {
        groups.published.push(post);
      } else {
        groups.draft.push(post);
      }
    }

    return groups;
  }, [posts]);

  const PostCard = ({ post }: { post: Post }) => {
    const isExpanded = expandedPost === post.id;
    const isConfirming = deleteConfirm === post.id;

    return (
      <div key={post.id} class="border border-[var(--color-border)] rounded-lg overflow-hidden bg-white transition hover:shadow-sm">
        {/* Card Header */}
        <div class="flex items-start gap-4 p-4">
          {post.imagen_url && (
            <div class="flex-shrink-0 w-16 h-16 overflow-hidden rounded-md bg-[var(--color-bg-subtle)]">
              <img
                src={post.imagen_url}
                alt={post.titulo}
                class="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}

          <div class="flex-grow min-w-0">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <h3 class="text-lg font-semibold text-[var(--color-text-primary)] truncate">
                  {post.titulo}
                </h3>
                <p class="text-sm text-[var(--color-text-secondary)] truncate">
                  /{currentLanguage}/{post.slug}
                </p>
              </div>
              {getStatusBadge(post)}
            </div>

            {/* Dates */}
            <div class="mt-3 flex flex-wrap gap-3 text-xs text-[var(--color-text-tertiary)]">
              <div class="flex items-center gap-1">
                <Calendar size={14} />
                <span>
                  {t(currentLanguage, "editor.createdLabel", "admin")}:&nbsp;
                  {formatDate(post.fecha || post.created_at)}
                </span>
              </div>
              {post.scheduled_at && post.status === "scheduled" && (
                <div class="flex items-center gap-1 text-[var(--color-warning)]">
                  <Clock size={14} />
                  <span>
                    {t(currentLanguage, "scheduling.scheduledFor", "admin")}&nbsp;
                    {formatDate(post.scheduled_at)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Expand Button */}
          <button
            type="button"
            onClick={() => setExpandedPost(isExpanded ? null : post.id)}
            class="flex-shrink-0 p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition"
            aria-label="Toggle actions"
          >
            <ChevronDown
              size={20}
              style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
            />
          </button>
        </div>

        {/* Expanded Actions */}
        {isExpanded && (
          <div class="border-t border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-4 py-3 flex flex-wrap gap-2">
            <a
              href={`/${currentLanguage}/posts/${post.slug}`}
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent-primary)] hover:border-[var(--color-accent-primary)] transition text-sm font-medium"
            >
              <Eye size={16} />
              View
            </a>

            <a
              href={`/${currentLanguage}/admin/edit-post/${post.slug}`}
              class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-accent-primary)] text-white hover:bg-[var(--color-accent-primary)]/90 transition text-sm font-medium"
            >
              <Edit size={16} />
              {t(currentLanguage, "editPost", "admin")}
            </a>

            {isConfirming ? (
              <div class="flex gap-2">
                <button
                  onClick={() => handleDeletePost(post.slug)}
                  disabled={isDeleting}
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--color-error)] text-white hover:bg-[var(--color-error)]/90 transition text-sm font-medium disabled:opacity-50"
                >
                  {isDeleting ? "Deleting..." : "Confirm"}
                </button>
                <button
                  onClick={() => setDeleteConfirm(null)}
                  disabled={isDeleting}
                  class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:border-[var(--color-text-primary)] transition text-sm font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setDeleteConfirm(post.id)}
                class="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--color-error)] text-[var(--color-error)] hover:bg-[var(--color-error)]/10 transition text-sm font-medium"
              >
                <Trash2 size={16} />
                {t(currentLanguage, "deletePost", "admin")}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div class="space-y-8">
      {/* Scheduled Posts Section */}
      {groupedPosts.scheduled.length > 0 && (
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <Clock size={20} class="text-[var(--color-warning)]" />
            <h2 class="text-xl font-semibold text-[var(--color-text-primary)]">
              Scheduled ({groupedPosts.scheduled.length})
            </h2>
          </div>
          <div class="grid gap-4">
            {groupedPosts.scheduled.map((post) => (
              <PostCard post={post} />
            ))}
          </div>
        </div>
      )}

      {/* Published Posts Section */}
      {groupedPosts.published.length > 0 && (
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <Eye size={20} class="text-[var(--color-success)]" />
            <h2 class="text-xl font-semibold text-[var(--color-text-primary)]">
              Published ({groupedPosts.published.length})
            </h2>
          </div>
          <div class="grid gap-4">
            {groupedPosts.published.map((post) => (
              <PostCard post={post} />
            ))}
          </div>
        </div>
      )}

      {/* Draft Posts Section */}
      {groupedPosts.draft.length > 0 && (
        <div class="space-y-4">
          <div class="flex items-center gap-3">
            <AlertCircle size={20} class="text-[var(--color-text-secondary)]" />
            <h2 class="text-xl font-semibold text-[var(--color-text-primary)]">
              Drafts ({groupedPosts.draft.length})
            </h2>
          </div>
          <div class="grid gap-4">
            {groupedPosts.draft.map((post) => (
              <PostCard post={post} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


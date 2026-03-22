import { useEffect, useState } from "preact/hooks";
import { ThumbsDown, ThumbsUp, MessageSquare } from "lucide-preact";
import { getApiUrl } from "../../lib/env";
import { useSession } from "../../hooks/useSession";
import DeleteAccountSection from "./DeleteAccountSection";

interface Props {
  language: "en" | "es";
  labels: {
    title: string;
    adminBadge: string;
    email: string;
    statistics: string;
    likesGiven: string;
    dislikesGiven: string;
    commentsPosted: string;
    likedPosts: string;
    noLikedPosts: string;
    viewAll: string;
    deleteAccount: {
      dangerZone: string;
      deleteWarning: string;
      deleteAccount: string;
      modalTitle: string;
      warning: string;
      deletedItems: {
        profile: string;
        comments: string;
        reactions: string;
        sessions: string;
        tokens: string;
      };
      additionalWarning: string;
      confirmationPrompt: string;
      confirmationPlaceholder: string;
      confirmationWord: string;
      cancel: string;
      confirmDelete: string;
      processing: string;
      success: string;
      error: string;
    };
  };
}

type LikedPost = {
  liked_at: string | null;
  post: {
    id: string;
    titulo: string;
    slug: string;
    language: string;
    imagen_url: string | null;
  };
};

type ProfilePayload = {
  stats: {
    likes_given: number;
    dislikes_given: number;
    comments_posted: number;
  };
  liked_posts_total: number;
  liked_posts: LikedPost[];
  pagination?: { limit: number; offset: number };
};

const API_URL = getApiUrl().replace(/\/$/, "");

export default function ProfilePageClient({ language, labels }: Props) {
  const { user, loading } = useSession();
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");
  const [payload, setPayload] = useState<ProfilePayload | null>(null);
  const [showAllLikes, setShowAllLikes] = useState(false);

  const locale = language === "es" ? "es-ES" : "en-US";

  useEffect(() => {
    if (loading) return;
    if (!user) {
      const next = encodeURIComponent(window.location.href);
      window.location.assign(`/auth/signin?next=${next}`);
    }
  }, [loading, user]);

  useEffect(() => {
    if (loading || !user) return;

    const controller = new AbortController();
    const fetchData = async () => {
      setDataLoading(true);
      setError("");
      try {
        const limit = showAllLikes ? 200 : 20;
        const res = await fetch(`${API_URL}/api/users/profile?limit=${limit}`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok) {
          if (res.status === 401) {
            const next = encodeURIComponent(window.location.href);
            window.location.assign(`/auth/signin?next=${next}`);
            return;
          }
          const body = await res.json().catch(() => null);
          setError(body?.error || "Failed to load profile data.");
          setPayload(null);
          return;
        }

        const body = await res.json().catch(() => null);
        setPayload(body?.data ?? null);
      } catch (err) {
        if ((err as { name?: string })?.name === "AbortError") return;
        setError("Failed to load profile data.");
        setPayload(null);
      } finally {
        setDataLoading(false);
      }
    };

    fetchData();
    return () => controller.abort();
  }, [loading, user?.id, showAllLikes]);

  const stats = payload?.stats ?? {
    likes_given: 0,
    dislikes_given: 0,
    comments_posted: 0,
  };

  const likedPosts = payload?.liked_posts ?? [];
  const likedTotal = payload?.liked_posts_total ?? 0;

  if (loading) {
    return (
      <div class="space-y-6">
        <div class="rounded-2xl border border-[var(--color-border)] bg-white p-6">
          <p class="text-[var(--color-text-secondary)]">Loading…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div class="space-y-10">
      <header class="flex items-start justify-between gap-6">
        <div>
          <h1 class="text-3xl font-bold text-[var(--color-text-primary)]">
            {labels.title}
          </h1>
        </div>
      </header>

      <section class="rounded-2xl border border-[var(--color-border)] bg-white p-6">
        <div class="flex flex-col sm:flex-row sm:items-center gap-6">
          <img
            src={user.avatar_url || "/avatar-placeholder.png"}
            alt={user.full_name || user.email || "User"}
            width={120}
            height={120}
            class="h-[120px] w-[120px] rounded-full border border-[var(--color-border)] object-cover"
          />
          <div class="flex-1">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-2xl font-bold text-[var(--color-text-primary)]">
                {user.full_name || user.email}
              </h2>
              {user.is_admin ? (
                <span class="inline-flex items-center rounded-full bg-[var(--color-accent-light)] px-2 py-0.5 text-xs font-semibold text-[var(--color-accent-primary)]">
                  {labels.adminBadge}
                </span>
              ) : null}
            </div>
            <p class="mt-1 text-sm text-[var(--color-text-tertiary)]">
              {labels.email}: {user.email}
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 class="text-lg font-bold text-[var(--color-text-primary)]">
          {labels.statistics}
        </h2>

        <div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="rounded-2xl border border-[var(--color-border)] bg-white p-5 min-h-[104px]">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm text-[var(--color-text-secondary)]">
                  {labels.likesGiven}
                </p>
                <p class="mt-1 text-3xl font-bold text-[var(--color-text-primary)]">
                  {dataLoading ? "…" : stats.likes_given}
                </p>
              </div>
              <div class="h-11 w-11 rounded-xl bg-[var(--color-accent-light)] flex items-center justify-center">
                <ThumbsUp className="h-5 w-5 text-[var(--color-accent-primary)]" />
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-[var(--color-border)] bg-white p-5 min-h-[104px]">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm text-[var(--color-text-secondary)]">
                  {labels.dislikesGiven}
                </p>
                <p class="mt-1 text-3xl font-bold text-[var(--color-text-primary)]">
                  {dataLoading ? "…" : stats.dislikes_given}
                </p>
              </div>
              <div class="h-11 w-11 rounded-xl bg-[var(--color-bg-subtle)] flex items-center justify-center">
                <ThumbsDown className="h-5 w-5 text-[var(--color-text-secondary)]" />
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-[var(--color-border)] bg-white p-5 min-h-[104px]">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm text-[var(--color-text-secondary)]">
                  {labels.commentsPosted}
                </p>
                <p class="mt-1 text-3xl font-bold text-[var(--color-text-primary)]">
                  {dataLoading ? "…" : stats.comments_posted}
                </p>
              </div>
              <div class="h-11 w-11 rounded-xl bg-[var(--color-bg-subtle)] flex items-center justify-center">
                <MessageSquare className="h-5 w-5 text-[var(--color-text-secondary)]" />
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <p class="mt-4 text-sm text-[var(--color-error)]">{error}</p>
        ) : null}
      </section>

      <section>
        <div class="flex items-center justify-between gap-4">
          <h2 class="text-lg font-bold text-[var(--color-text-primary)]">
            {labels.likedPosts}
          </h2>
          {!showAllLikes && likedTotal > 20 ? (
            <button
              type="button"
              class="text-sm font-semibold text-[var(--color-accent-primary)] hover:underline"
              onClick={() => setShowAllLikes(true)}
            >
              {labels.viewAll}
            </button>
          ) : null}
        </div>

        <div class="mt-4 space-y-3">
          {!dataLoading && likedPosts.length === 0 ? (
            <div class="rounded-2xl border border-[var(--color-border)] bg-white p-6">
              <p class="text-sm text-[var(--color-text-secondary)]">
                {labels.noLikedPosts}
              </p>
            </div>
          ) : null}

          {likedPosts.map((item) => {
            const postHref = `/${item.post.language}/posts/${item.post.slug}`;
            const dateLabel = item.liked_at
              ? new Date(item.liked_at).toLocaleDateString(locale, {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                })
              : null;

            return (
              <a
                href={postHref}
                class="group block rounded-2xl border border-[var(--color-border)] bg-white p-4 hover:border-[var(--color-accent-primary)]/30 hover:shadow-sm transition-all"
              >
                <div class="flex gap-4">
                  {item.post.imagen_url ? (
                    <img
                      src={item.post.imagen_url}
                      alt={item.post.titulo}
                      class="h-16 w-24 rounded-lg object-cover border border-[var(--color-border)] bg-[var(--color-bg-subtle)]"
                      loading="lazy"
                    />
                  ) : null}
                  <div class="min-w-0 flex-1">
                    <div class="flex items-start justify-between gap-3">
                      <h3 class="min-w-0 truncate text-base font-semibold text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-primary)] transition-colors">
                        {item.post.titulo}
                      </h3>
                      <span class="shrink-0 rounded-full border border-[var(--color-border)] bg-[var(--color-bg-subtle)] px-2 py-0.5 text-[10px] font-bold tracking-wide text-[var(--color-text-tertiary)]">
                        {String(item.post.language).toUpperCase()}
                      </span>
                    </div>
                    {dateLabel ? (
                      <p class="mt-1 text-xs text-[var(--color-text-tertiary)]">
                        {dateLabel}
                      </p>
                    ) : null}
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      </section>

      <DeleteAccountSection
        language={language}
        labels={{
          dangerZone: labels.deleteAccount.dangerZone,
          deleteWarning: labels.deleteAccount.deleteWarning,
          deleteAccount: labels.deleteAccount.deleteAccount,
          modalTitle: labels.deleteAccount.modalTitle,
          warning: labels.deleteAccount.warning,
          deletedItems: labels.deleteAccount.deletedItems,
          additionalWarning: labels.deleteAccount.additionalWarning,
          confirmationPrompt: labels.deleteAccount.confirmationPrompt,
          confirmationPlaceholder: labels.deleteAccount.confirmationPlaceholder,
          confirmationWord: labels.deleteAccount.confirmationWord,
          cancel: labels.deleteAccount.cancel,
          confirmDelete: labels.deleteAccount.confirmDelete,
          processing: labels.deleteAccount.processing,
          success: labels.deleteAccount.success,
          error: labels.deleteAccount.error,
        }}
      />
    </div>
  );
}

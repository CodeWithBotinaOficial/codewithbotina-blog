import { useEffect, useMemo, useState } from "preact/hooks";
import { getApiUrl } from "../../lib/env";
import { useSession } from "../../hooks/useSession";
import CommentItem from "./CommentItem";

interface CommentUser {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Comment {
  id: string;
  post_id: string;
  translation_group_id?: string | null;
  parent_id?: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  is_pinned: boolean;
  post_language?: string;
  post_slug?: string;
  post_title?: string;
  user: CommentUser;
  replies?: Comment[];
}

interface Props {
  postId: string;
  initialComments: Comment[];
  currentLanguage: string;
  hasTranslations?: boolean;
  currentUserId?: string | null;
  isAdmin?: boolean;
  labels?: {
    empty: string;
    edit: string;
    delete: string;
    save: string;
    saving: string;
    cancel: string;
    pin: string;
    unpin: string;
    pinned: string;
    anonymous: string;
    updateError: string;
    unifiedNotice: string;
    fromTranslation: string;
  };
  dateLocale?: string;
}

const API_URL = getApiUrl();

export function sortComments(list: Comment[]) {
  return [...list].sort((a, b) => {
    if (a.is_pinned && !b.is_pinned) return -1;
    if (!a.is_pinned && b.is_pinned) return 1;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
}

function removeCommentById(list: Comment[], commentId: string): Comment[] {
  return list
    .filter((comment) => comment.id !== commentId)
    .map((comment) => ({
      ...comment,
      replies: comment.replies
        ? removeCommentById(comment.replies, commentId)
        : comment.replies,
    }));
}

function updateCommentById(list: Comment[], updated: Comment): Comment[] {
  return list.map((comment) => {
    if (comment.id === updated.id) return { ...comment, ...updated };
    return {
      ...comment,
      replies: comment.replies
        ? updateCommentById(comment.replies, updated)
        : comment.replies,
    };
  });
}

export default function CommentList({
  postId,
  initialComments,
  currentLanguage,
  hasTranslations,
  currentUserId,
  isAdmin,
  labels,
  dateLocale,
}: Props) {
  const copy = labels ?? {
    empty: "No comments yet. Be the first to comment.",
    edit: "Edit",
    delete: "Delete",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    pin: "Pin",
    unpin: "Unpin",
    pinned: "Pinned",
    anonymous: "Anonymous",
    updateError: "Failed to update comment.",
    unifiedNotice:
      "Comments from all language versions of this post are shown here.",
    fromTranslation: "Comment from {{language}} version",
  };

  const [comments, setComments] = useState<Comment[]>(initialComments || []);
  const { user, isAdmin: sessionIsAdmin } = useSession();
  const effectiveUserId = currentUserId ?? user?.id ?? null;
  const effectiveIsAdmin = isAdmin ?? sessionIsAdmin;

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<Comment>).detail;
      if (detail?.id) {
        setComments((prev) => [detail, ...prev]);
      }
    };

    window.addEventListener("comment:created", handler as EventListener);
    return () =>
      window.removeEventListener("comment:created", handler as EventListener);
  }, []);

  const sortedComments = useMemo(() => {
    return sortComments(comments);
  }, [comments]);

  const handleDelete = async (commentId: string) => {
    const response = await fetch(`${API_URL}/api/comments/${commentId}`, {
      method: "DELETE",
      credentials: "include",
    });

    if (response.ok) {
      setComments((prev) => removeCommentById(prev, commentId));
    }
  };

  const handleUpdate = async (commentId: string, content: string) => {
    const response = await fetch(`${API_URL}/api/comments/${commentId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      credentials: "include",
      body: JSON.stringify({ content }),
    });

    if (!response.ok) return null;
    const body = await response.json();
    const updated = body?.data as Comment;
    if (updated?.id) {
      setComments((prev) => updateCommentById(prev, updated));
    }
    return updated ?? null;
  };

  const handleTogglePin = async (commentId: string, nextPinned: boolean) => {
    const endpoint = nextPinned ? "pin" : "unpin";
    const response = await fetch(
      `${API_URL}/api/comments/${commentId}/${endpoint}`,
      {
        method: "POST",
        credentials: "include",
      },
    );

    if (!response.ok) return;
    const body = await response.json();
    const updated = body?.data as {
      id: string;
      is_pinned: boolean;
      updated_at?: string;
    };
    if (!updated?.id) return;

    setComments((prev) =>
      updateCommentById(prev, {
        id: updated.id,
        is_pinned: updated.is_pinned,
        updated_at: updated.updated_at,
      } as Comment),
    );
  };

  return (
    <div class="comment-list" data-post-id={postId}>
      {hasTranslations && sortedComments.length > 0 ? (
        <div class="unified-comments-notice">
          <span aria-hidden="true">🌐</span>
          <p>{copy.unifiedNotice}</p>
        </div>
      ) : null}

      {sortedComments.length === 0 ? (
        <p class="comment-empty">{copy.empty}</p>
      ) : (
        sortedComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            currentLanguage={currentLanguage}
            currentUserId={effectiveUserId}
            isAdmin={effectiveIsAdmin}
            labels={copy}
            dateLocale={dateLocale}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            onTogglePin={handleTogglePin}
          />
        ))
      )}
    </div>
  );
}

import { useState } from "preact/hooks";
import type { Comment } from "./CommentList";

interface Props {
  comment: Comment;
  currentUserId: string | null;
  isAdmin: boolean;
  onDelete: () => void;
  onUpdate: (content: string) => Promise<Comment | null>;
  onTogglePin: () => void;
}

function formatDate(value: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export default function CommentItem({
  comment,
  currentUserId,
  isAdmin,
  onDelete,
  onUpdate,
  onTogglePin,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(comment.content);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const isAuthor = currentUserId === comment.user?.id;
  const canEdit = isAuthor;
  const canDelete = isAuthor || isAdmin;
  const canPin = isAdmin;
  const isValid = editedContent.trim().length >= 10 &&
    editedContent.trim().length <= 1000;

  const handleSave = async () => {
    if (!isValid || isSaving) return;
    setIsSaving(true);
    setError("");
    const updated = await onUpdate(editedContent);
    if (updated) {
      setIsEditing(false);
    } else {
      setError("Failed to update comment.");
    }
    setIsSaving(false);
  };

  return (
    <article class={`comment-item ${comment.is_pinned ? "is-pinned" : ""}`}>
      <header class="comment-header">
        <div class="comment-author">
          <img
            src={comment.user?.avatar_url || "/avatar-placeholder.png"}
            alt={comment.user?.full_name || "User avatar"}
            class="comment-avatar"
            width={40}
            height={40}
            loading="lazy"
          />
          <div>
            <p class="comment-name">{comment.user?.full_name || "Anonymous"}</p>
            <p class="comment-date">{formatDate(comment.created_at)}</p>
          </div>
        </div>

        {comment.is_pinned ? (
          <span class="comment-pinned-badge">Pinned</span>
        ) : null}
      </header>

      <div class="comment-body">
        {isEditing ? (
          <textarea
            class="comment-edit"
            value={editedContent}
            onInput={(e) => setEditedContent((e.target as HTMLTextAreaElement).value)}
            rows={3}
            maxLength={1000}
          />
        ) : (
          <p>{comment.content}</p>
        )}
      </div>

      <div class="comment-actions">
        {canEdit ? (
          isEditing ? (
            <>
              <button
                type="button"
                class="comment-action"
                onClick={handleSave}
                disabled={!isValid || isSaving}
              >
                {isSaving ? "Saving..." : "Save"}
              </button>
              <button
                type="button"
                class="comment-action"
                onClick={() => {
                  setIsEditing(false);
                  setEditedContent(comment.content);
                  setError("");
                }}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              type="button"
              class="comment-action"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </button>
          )
        ) : null}

        {canDelete ? (
          <button type="button" class="comment-action danger" onClick={onDelete}>
            Delete
          </button>
        ) : null}

        {canPin ? (
          <button type="button" class="comment-action" onClick={onTogglePin}>
            {comment.is_pinned ? "Unpin" : "Pin"}
          </button>
        ) : null}
      </div>

      {error ? <p class="comment-error">{error}</p> : null}
    </article>
  );
}

import { useState } from "preact/hooks";
import type { Comment } from "./CommentList";

interface Props {
  comment: Comment;
  currentUserId: string | null;
  isAdmin: boolean;
  onDelete: () => void;
  onUpdate: (_content: string) => Promise<Comment | null>;
  onTogglePin: () => void;
  labels?: {
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
  };
  dateLocale?: string;
}

function formatDate(value: string, locale?: string) {
  const date = new Date(value);
  return new Intl.DateTimeFormat(locale || "en-US", {
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
  labels,
  dateLocale,
}: Props) {
  const copy = labels ?? {
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
  };

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
      setError(copy.updateError);
    }
    setIsSaving(false);
  };

  return (
    <article class={`comment-item ${comment.is_pinned ? "is-pinned" : ""}`}>
      <header class="comment-header">
        <div class="comment-author">
          <img
            src={comment.user?.avatar_url || "/avatar-placeholder.png"}
            alt={comment.user?.full_name || copy.anonymous}
            class="comment-avatar"
            width={40}
            height={40}
            loading="lazy"
          />
          <div>
            <p class="comment-name">{comment.user?.full_name || copy.anonymous}</p>
            <p class="comment-date">{formatDate(comment.created_at, dateLocale)}</p>
          </div>
        </div>

        {comment.is_pinned ? (
          <span class="comment-pinned-badge">{copy.pinned}</span>
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
                {isSaving ? copy.saving : copy.save}
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
                {copy.cancel}
              </button>
            </>
          ) : (
            <button
              type="button"
              class="comment-action"
              onClick={() => setIsEditing(true)}
            >
              {copy.edit}
            </button>
          )
        ) : null}

        {canDelete ? (
          <button type="button" class="comment-action danger" onClick={onDelete}>
            {copy.delete}
          </button>
        ) : null}

        {canPin ? (
          <button type="button" class="comment-action" onClick={onTogglePin}>
            {comment.is_pinned ? copy.unpin : copy.pin}
          </button>
        ) : null}
      </div>

      {error ? <p class="comment-error">{error}</p> : null}
    </article>
  );
}

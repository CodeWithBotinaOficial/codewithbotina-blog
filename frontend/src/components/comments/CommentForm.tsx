import { useState } from "preact/hooks";
import { getApiUrl } from "../../lib/env";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../hooks/useSession";

interface Props {
  postId: string;
}

const API_URL = getApiUrl();

export default function CommentForm({ postId }: Props) {
  const { user, loading } = useSession();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isValid = content.trim().length >= 10 && content.trim().length <= 1000;

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    if (!user || !isValid || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setError("You must be signed in to comment.");
        return;
      }

      const response = await fetch(`${API_URL}/api/comments/${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error || "Failed to post comment.");
        return;
      }

      const body = await response.json();
      if (body?.data) {
        window.dispatchEvent(
          new CustomEvent("comment:created", { detail: body.data }),
        );
      }

      setContent("");
    } catch (_error) {
      setError("Failed to post comment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <p class="comment-loading">Loading session...</p>;
  }

  if (!user) {
    const next = typeof window !== "undefined" ? window.location.href : "/";
    const authUrl = `${API_URL}/api/auth/google?next=${encodeURIComponent(next)}`;
    return (
      <p class="comment-signin">
        <a href={authUrl}>Sign in</a> to leave a comment.
      </p>
    );
  }

  return (
    <form class="comment-form" onSubmit={handleSubmit}>
      <img
        src={user.avatar_url || "/avatar-placeholder.png"}
        alt="Your avatar"
        class="comment-avatar"
        width={40}
        height={40}
      />

      <div class="comment-form-fields">
        <textarea
          class="comment-input"
          value={content}
          onInput={(event) =>
            setContent((event.target as HTMLTextAreaElement).value)}
          placeholder="Leave a comment..."
          maxLength={1000}
          rows={3}
        />

        <div class="comment-form-footer">
          <span class="comment-counter">{content.trim().length}/1000</span>
          <button
            type="submit"
            class="comment-submit"
            disabled={!isValid || isSubmitting}
          >
            {isSubmitting ? "Posting..." : "Post Comment"}
          </button>
        </div>
        {error ? <p class="comment-error">{error}</p> : null}
      </div>
    </form>
  );
}

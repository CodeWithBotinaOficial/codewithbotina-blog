import { useState } from "preact/hooks";
import { getApiUrl } from "../../lib/env";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../hooks/useSession";

interface Props {
  postId: string;
  labels?: {
    signIn: string;
    signInSuffix: string;
    loading: string;
    placeholder: string;
    submit: string;
    submitting: string;
    authError: string;
    postError: string;
    postErrorRetry: string;
  };
}

const API_URL = getApiUrl();

export default function CommentForm({ postId, labels }: Props) {
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
        setError(copy.authError);
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
        setError(body?.error || copy.postError);
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
      setError(copy.postErrorRetry);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return <p class="comment-loading">{copy.loading}</p>;
  }

  if (!user) {
    const next = typeof window !== "undefined" ? window.location.href : "/";
    const authUrl = `${API_URL}/api/auth/google?next=${encodeURIComponent(next)}`;
    return (
      <p class="comment-signin">
        <a href={authUrl}>{copy.signIn}</a> {copy.signInSuffix}
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
          placeholder={copy.placeholder}
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
            {isSubmitting ? copy.submitting : copy.submit}
          </button>
        </div>
        {error ? <p class="comment-error">{error}</p> : null}
      </div>
    </form>
  );
}
  const copy = labels ?? {
    signIn: "Sign in",
    signInSuffix: "to leave a comment.",
    loading: "Loading session...",
    placeholder: "Leave a comment...",
    submit: "Post comment",
    submitting: "Posting...",
    authError: "You must be signed in to comment.",
    postError: "Failed to post comment.",
    postErrorRetry: "Failed to post comment. Please try again.",
  };

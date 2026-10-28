import { useState } from "preact/hooks";
import { apiCall } from "../../lib/api";
import { getApiUrl } from "../../lib/env";
import { getAuthRoute } from "../../lib/auth-endpoints";
import { useBackendStatus } from "../../hooks/useBackendStatus";
import { useSession } from "../../hooks/useSession";
import { getLanguageFromPath, t, type SupportedLanguage } from "../../lib/i18n";

interface Props {
  postId: string;
  currentLanguage?: SupportedLanguage;
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

export default function CommentForm({ postId, labels, currentLanguage }: Props) {
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

  const { user, loading } = useSession();
  const { isMaintenanceMode } = useBackendStatus();
  const language = currentLanguage ??
    (typeof window === "undefined"
      ? "en"
      : getLanguageFromPath(window.location.pathname));
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const isValid = content.trim().length >= 10 && content.trim().length <= 1000;

  const handleSubmit = async (event: Event) => {
    event.preventDefault();
    if (isMaintenanceMode || !user || !isValid || isSubmitting) return;

    setIsSubmitting(true);
    setError("");

    try {
      const response = await apiCall(`${API_URL}/api/comments/${postId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          setError(copy.authError);
          return;
        }
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
    const authUrl = `${getAuthRoute("/google")}?next=${encodeURIComponent(next)}`;
    return (
      <div class="comment-signin">
        <p>{t(language, "maintenance.authRequiredToComment", "common")}</p>
        <a class="comment-signin-link" href={authUrl}>
          {t(language, "maintenance.signInToContinue", "common")}
        </a>
        {isMaintenanceMode ? (
          <p class="comment-maintenance" role="status">
            {t(language, "maintenance.featureUnavailable", "common")}
          </p>
        ) : null}
      </div>
    );
  }

  if (isMaintenanceMode) {
    return (
      <p class="comment-error comment-maintenance" role="status">
        {t(language, "maintenance.featureUnavailable", "common")}
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

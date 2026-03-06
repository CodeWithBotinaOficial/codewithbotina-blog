import { useEffect, useState } from "preact/hooks";
import { getApiUrl } from "../../lib/env";
import { supabase } from "../../lib/supabase";
import { useSession } from "../../hooks/useSession";

interface Props {
  postId: string;
  initialLikes: number;
  initialDislikes: number;
  userReaction: "like" | "dislike" | null;
  isAuthenticated: boolean;
  labels?: {
    signIn: string;
    signInSuffix: string;
    loading: string;
    error: string;
  };
}

const API_URL = getApiUrl();

export default function ReactionButtons({
  postId,
  initialLikes,
  initialDislikes,
  userReaction,
  isAuthenticated,
  labels,
}: Props) {
  const copy = labels ?? {
    signIn: "Sign in",
    signInSuffix: "to react.",
    loading: "Loading reactions...",
    error: "Failed to update reaction. Please try again.",
  };

  const { user, loading, isAuthenticated: sessionAuth } = useSession();
  const [likes, setLikes] = useState(initialLikes);
  const [dislikes, setDislikes] = useState(initialDislikes);
  const [currentReaction, setCurrentReaction] = useState(userReaction);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState("");

  const authenticated = isAuthenticated || sessionAuth;
  const nextUrl = typeof window !== "undefined" ? window.location.href : "/";

  useEffect(() => {
    const fetchUserReaction = async () => {
      if (!authenticated || !user) return;

      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) return;

      const response = await fetch(`${API_URL}/api/reactions/user/${postId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) return;
      const body = await response.json();
      if (body?.data?.user_reaction !== undefined) {
        setCurrentReaction(body.data.user_reaction);
      }
    };

    fetchUserReaction();
  }, [authenticated, postId, user?.id]);

  const getAccessToken = async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || null;
  };

  const handleReaction = async (type: "like" | "dislike") => {
    if (!authenticated || !user) {
      setMessage(`${copy.signIn} ${copy.signInSuffix}`.trim());
      return;
    }

    if (isLoading) return;
    setIsLoading(true);
    setMessage("");

    const previousReaction = currentReaction;
    const previousLikes = likes;
    const previousDislikes = dislikes;

    let nextLikes = likes;
    let nextDislikes = dislikes;
    let nextReaction: "like" | "dislike" | null = currentReaction;

    if (type === "like") {
      if (currentReaction === "like") {
        nextLikes -= 1;
        nextReaction = null;
      } else if (currentReaction === "dislike") {
        nextDislikes -= 1;
        nextLikes += 1;
        nextReaction = "like";
      } else {
        nextLikes += 1;
        nextReaction = "like";
      }
    } else {
      if (currentReaction === "dislike") {
        nextDislikes -= 1;
        nextReaction = null;
      } else if (currentReaction === "like") {
        nextLikes -= 1;
        nextDislikes += 1;
        nextReaction = "dislike";
      } else {
        nextDislikes += 1;
        nextReaction = "dislike";
      }
    }

    setLikes(nextLikes);
    setDislikes(nextDislikes);
    setCurrentReaction(nextReaction);

    try {
      const token = await getAccessToken();
      if (!token) throw new Error("Missing access token");

      const response = await fetch(
        `${API_URL}/api/reactions/${postId}/${type}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error("Failed to update reaction");
      }

      const body = await response.json();
      if (body?.data?.counts) {
        setLikes(body.data.counts.likes);
        setDislikes(body.data.counts.dislikes);
      }
      if (body?.data?.reaction !== undefined) {
        setCurrentReaction(body.data.reaction);
      }
    } catch (_error) {
      setLikes(previousLikes);
      setDislikes(previousDislikes);
      setCurrentReaction(previousReaction);
      setMessage(copy.error);
    } finally {
      setIsLoading(false);
    }
  };

  if (loading) {
    return <p class="reaction-loading">{copy.loading}</p>;
  }

  return (
    <div class="reaction-buttons">
      <button
        type="button"
        class={`reaction-button ${currentReaction === "like" ? "active" : ""}`}
        disabled={isLoading}
        onClick={() => handleReaction("like")}
      >
        👍 <span>{likes}</span>
      </button>

      <button
        type="button"
        class={`reaction-button ${currentReaction === "dislike" ? "active" : ""}`}
        disabled={isLoading}
        onClick={() => handleReaction("dislike")}
      >
        👎 <span>{dislikes}</span>
      </button>

      {!authenticated ? (
        <p class="reaction-signin">
          <a href={`${API_URL}/api/auth/google?next=${encodeURIComponent(nextUrl)}`}>
            {copy.signIn}
          </a>{" "}
          {copy.signInSuffix}
        </p>
      ) : null}

      {message ? <p class="reaction-message">{message}</p> : null}
    </div>
  );
}

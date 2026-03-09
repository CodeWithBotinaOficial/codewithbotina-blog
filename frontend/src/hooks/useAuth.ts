import { setAuthState } from "../lib/auth-state";
import { getAuthRoute } from "../lib/auth-endpoints";
import { getApiUrl } from "../lib/env";

const API_URL = getApiUrl();

export function useAuth() {
  const signIn = () => {
    const next = typeof window !== "undefined"
      ? encodeURIComponent(window.location.href)
      : "";
    const url = next
      ? `${API_URL}/api/auth/google?next=${next}`
      : `${API_URL}/api/auth/google`;
    window.location.assign(url);
  };

  const signOut = async () => {
    await fetch(getAuthRoute("/signout"), {
      method: "POST",
      credentials: "include",
    });
    setAuthState(false);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cwb:auth-changed"));
      window.location.assign(window.location.href || "/");
    }
  };

  const refresh = async () => {
    const res = await fetch(getAuthRoute("/refresh"), {
      method: "POST",
      credentials: "include",
    });

    if (!res.ok) return null;
    const body = await res.json();
    setAuthState(true);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("cwb:auth-changed"));
    }
    return body;
  };

  return { signIn, signOut, refresh };
}

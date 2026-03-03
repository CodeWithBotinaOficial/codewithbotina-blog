import { supabase } from "../lib/supabase";
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
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;

    await fetch(`${API_URL}/api/auth/signout`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      credentials: "include",
    });

    await supabase.auth.signOut();
    window.location.assign(window.location.href || "/");
  };

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    const payload = data.session?.refresh_token
      ? JSON.stringify({ refresh_token: data.session.refresh_token })
      : undefined;

    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      credentials: "include",
      body: payload,
    });

    if (!res.ok) return null;
    const body = await res.json();
    if (body?.access_token && body?.refresh_token) {
      await supabase.auth.setSession({
        access_token: body.access_token,
        refresh_token: body.refresh_token,
      });
    }
    return body;
  };

  return { signIn, signOut, refresh };
}

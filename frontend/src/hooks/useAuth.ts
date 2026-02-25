import { supabase } from "../lib/supabase";

const API_URL = import.meta.env.PUBLIC_API_URL ||
  "https://api.codewithbotina.com";

export function useAuth() {
  const signIn = () => {
    window.location.assign(`${API_URL}/api/auth/google`);
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
    window.location.assign("/");
  };

  const refresh = async () => {
    const { data } = await supabase.auth.getSession();
    if (!data.session?.refresh_token) return null;

    const res = await fetch(`${API_URL}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ refresh_token: data.session.refresh_token }),
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

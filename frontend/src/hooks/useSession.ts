import { useEffect, useState } from "preact/hooks";
import { supabase } from "../lib/supabase";
import { getApiUrl } from "../lib/env";

const API_URL = getApiUrl();

export interface AuthUser {
  id: string;
  email: string;
  full_name?: string | null;
  avatar_url?: string | null;
  google_id?: string | null;
  created_at?: string;
  last_login?: string;
  is_admin?: boolean;
}

export function useSession() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = Boolean(user);
  const isAdmin = Boolean(user?.is_admin);

  useEffect(() => {
    let active = true;
    let refreshAttempted = false;
    let refreshBlocked = false;

    const fetchUser = async () => {
      try {
        const fetchProfile = async (token?: string) => {
          const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
          const res = await fetch(`${API_URL}/api/auth/me`, {
            headers,
            credentials: "include",
          });

          if (!res.ok) return null;
          const body = await res.json();
          return body.user ?? null;
        };

        const refreshSession = async (refreshToken?: string) => {
          if (refreshBlocked) return false;
          const res = await fetch(
            `${API_URL}/api/auth/refresh`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: refreshToken ? JSON.stringify({ refresh_token: refreshToken }) : "{}",
            },
          );

          if (!res.ok) {
            refreshBlocked = true;
            return false;
          }
          const body = await res.json();
          if (body?.access_token && body?.refresh_token) {
            await supabase.auth.setSession({
              access_token: body.access_token,
              refresh_token: body.refresh_token,
            });
            return true;
          }
          refreshBlocked = true;
          return false;
        };

        const { data } = await supabase.auth.getSession();
        if (!active) return;

        if (!data.session) {
          if (typeof window !== "undefined") {
            const stored = window.localStorage.getItem("CodeWithBotinaAuth");
            if (!stored) {
              setUser(null);
              setLoading(false);
              return;
            }
            try {
              const parsed = JSON.parse(stored);
              if (!parsed?.access_token || !parsed?.refresh_token) {
                setUser(null);
                setLoading(false);
                return;
              }
            } catch (_error) {
              setUser(null);
              setLoading(false);
              return;
            }
          }

          if (refreshAttempted || refreshBlocked) {
            setUser(null);
            setLoading(false);
            return;
          }

          refreshAttempted = true;
          const refreshed = await refreshSession();
          if (refreshed) {
            return fetchUser();
          }

          setUser(null);
          setLoading(false);
          return;
        }

        if (data.session.expires_at) {
          const expiresInMs = data.session.expires_at * 1000 - Date.now();
          if (expiresInMs < 5 * 60 * 1000) {
            await refreshSession(data.session.refresh_token);
          }
        }

        const profile = await fetchProfile(data.session.access_token);

        if (!profile) {
          const refreshed = await refreshSession(data.session.refresh_token);
          if (refreshed) {
            return fetchUser();
          }
        }

        if (!active) return;

        setUser(profile ?? null);
      } catch (_error) {
        if (!active) return;
        setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      fetchUser();
    });

    return () => {
      active = false;
      listener?.subscription.unsubscribe();
    };
  }, []);

  return { user, loading, isAuthenticated, isAdmin };
}

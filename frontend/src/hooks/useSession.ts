import { useEffect, useState } from "preact/hooks";
import { getApiUrl } from "../lib/env";
import { AUTH_STATE_KEY, getAuthState, setAuthState } from "../lib/auth-state";

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
        const state = getAuthState();
        if (state === false) {
          setUser(null);
          setLoading(false);
          return;
        }

        const fetchProfile = async () => {
          const res = await fetch(`${API_URL}/api/auth/me`, {
            credentials: "include",
          });

          if (!res.ok) return null;
          const body = await res.json();
          return body.user ?? null;
        };

        const refreshSession = async () => {
          if (refreshBlocked) return false;
          const res = await fetch(`${API_URL}/api/auth/refresh`, {
            method: "POST",
            credentials: "include",
          });

          if (!res.ok) {
            refreshBlocked = true;
            return false;
          }

          refreshBlocked = false;
          return true;
        };

        let profile = await fetchProfile();

        if (!profile && !refreshAttempted) {
          refreshAttempted = true;
          const refreshed = await refreshSession();
          if (refreshed) {
            profile = await fetchProfile();
          }
        }

        if (!active) return;

        if (profile) {
          setAuthState(true);
        } else {
          setAuthState(false);
        }

        setUser(profile ?? null);
      } catch (_error) {
        if (!active) return;
        setUser(null);
        setAuthState(false);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchUser();

    const handleStorage = (event: StorageEvent) => {
      if (event.key === AUTH_STATE_KEY) {
        fetchUser();
      }
    };

    const handleAuthChange = () => {
      fetchUser();
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
      window.addEventListener("cwb:auth-changed", handleAuthChange);
    }

    return () => {
      active = false;
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", handleStorage);
        window.removeEventListener("cwb:auth-changed", handleAuthChange);
      }
    };
  }, []);

  return { user, loading, isAuthenticated, isAdmin };
}

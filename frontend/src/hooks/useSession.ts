import { useEffect, useState } from "preact/hooks";
import { supabase } from "../lib/supabase";

const API_URL = import.meta.env.PUBLIC_API_URL ||
  "https://api.codewithbotina.com";

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

  useEffect(() => {
    let active = true;

    const fetchUser = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!active) return;

        if (!data.session) {
          setUser(null);
          setLoading(false);
          return;
        }

        if (data.session.expires_at) {
          const expiresInMs = data.session.expires_at * 1000 - Date.now();
          if (expiresInMs < 5 * 60 * 1000) {
            const res = await fetch(
              `${API_URL}/api/auth/refresh`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({
                  refresh_token: data.session.refresh_token,
                }),
              },
            );

            if (res.ok) {
              const body = await res.json();
              if (body?.access_token && body?.refresh_token) {
                await supabase.auth.setSession({
                  access_token: body.access_token,
                  refresh_token: body.refresh_token,
                });
              }
            }
          }
        }

        const res = await fetch(
          `${API_URL}/api/auth/me`,
          {
            headers: {
              Authorization: `Bearer ${data.session.access_token}`,
            },
            credentials: "include",
          },
        );

        if (!active) return;

        if (!res.ok) {
          setUser(null);
          setLoading(false);
          return;
        }

        const body = await res.json();
        setUser(body.user ?? null);
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

  return { user, loading };
}

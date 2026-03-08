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

let sharedUser: AuthUser | null = null;
let sharedResolved = false;
let sharedPromise: Promise<AuthUser | null> | null = null;

async function resolveSessionUser(): Promise<AuthUser | null> {
  let refreshAttempted = false;
  let refreshBlocked = false;
  const state = getAuthState();
  if (state !== true) {
    setAuthState(false);
    return null;
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

  if (profile) {
    setAuthState(true);
  } else {
    setAuthState(false);
  }

  return profile ?? null;
}

function getSharedSession(): Promise<AuthUser | null> {
  if (sharedResolved) {
    return Promise.resolve(sharedUser);
  }
  if (sharedPromise) {
    return sharedPromise;
  }
  sharedPromise = resolveSessionUser()
    .then((user) => {
      sharedUser = user;
      sharedResolved = true;
      return user;
    })
    .catch((error) => {
      setAuthState(false);
      throw error;
    })
    .finally(() => {
      sharedPromise = null;
    });
  return sharedPromise;
}

function invalidateSharedSession() {
  sharedResolved = false;
  sharedUser = null;
}

export function useSession() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const isAuthenticated = Boolean(user);
  const isAdmin = Boolean(user?.is_admin);

  useEffect(() => {
    let active = true;

    const fetchUser = async () => {
      try {
        const profile = await getSharedSession();
        if (!active) return;
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
        invalidateSharedSession();
        fetchUser();
      }
    };

    const handleAuthChange = () => {
      invalidateSharedSession();
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

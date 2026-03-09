import { useEffect, useState } from "preact/hooks";
import {
  AUTH_STATE_KEY,
  clearAuthState,
  getAuthState,
  setAuthState,
} from "../lib/auth-state";
import { getAuthRoute } from "../lib/auth-endpoints";

const BACKGROUND_REFRESH_INTERVAL_MS = 55 * 60 * 1000;

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
let backgroundRefreshTimer: number | null = null;

async function fetchProfile(): Promise<AuthUser | null> {
  const res = await fetch(getAuthRoute("/me"), {
    credentials: "include",
  });

  if (!res.ok) return null;
  const body = await res.json();
  return body.user ?? null;
}

async function refreshSession(): Promise<boolean> {
  const res = await fetch(getAuthRoute("/refresh"), {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) return false;

  setAuthState(true);
  return true;
}

function clearBackgroundRefreshTimer() {
  if (typeof window === "undefined") return;
  if (backgroundRefreshTimer !== null) {
    window.clearTimeout(backgroundRefreshTimer);
    backgroundRefreshTimer = null;
  }
}

function scheduleBackgroundRefresh() {
  if (typeof window === "undefined") return;

  clearBackgroundRefreshTimer();
  backgroundRefreshTimer = window.setTimeout(async () => {
    const refreshed = await refreshSession();
    if (!refreshed) {
      setAuthState(false);
    }
    invalidateSharedSession();
    window.dispatchEvent(new Event("cwb:auth-changed"));
  }, BACKGROUND_REFRESH_INTERVAL_MS);
}

async function resolveSessionUser(): Promise<AuthUser | null> {
  const state = getAuthState();
  if (state === false) {
    clearBackgroundRefreshTimer();
    return null;
  }

  let profile = await fetchProfile();

  if (!profile && state === true) {
    const refreshed = await refreshSession();
    if (refreshed) profile = await fetchProfile();
  }

  if (profile) {
    setAuthState(true);
    scheduleBackgroundRefresh();
  } else {
    if (state === true) {
      setAuthState(false);
    } else {
      clearAuthState();
    }
    clearBackgroundRefreshTimer();
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
      if (getAuthState() === true) {
        setAuthState(false);
      } else {
        clearAuthState();
      }
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
        if (getAuthState() === true) {
          setAuthState(false);
        } else {
          clearAuthState();
        }
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

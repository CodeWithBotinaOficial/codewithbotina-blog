import { getApiUrl } from "./env";
import { setAuthState } from "./auth-state";

const API_URL = getApiUrl();

export function initAuthListener() {
  // Deprecated: kept for backward compatibility.
}

export async function getCurrentUser() {
  const response = await fetch(`${API_URL}/api/auth/me`, {
    credentials: "include",
  });
  if (!response.ok) return null;
  const body = await response.json();
  return body?.user ?? null;
}

export async function signOut() {
  await fetch(`${API_URL}/api/auth/signout`, {
    method: "POST",
    credentials: "include",
  });
  setAuthState(false);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cwb:auth-changed"));
    window.location.assign("/");
  }
}

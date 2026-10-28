import { apiCall } from "./api";
import { setAuthState } from "./auth-state";
import { getAuthRoute } from "./auth-endpoints";

export function initAuthListener() {
  // Deprecated: kept for backward compatibility.
}

export async function getCurrentUser() {
  const response = await apiCall(getAuthRoute("/me"), {
    credentials: "include",
  });
  if (!response.ok) return null;
  const body = await response.json();
  return body?.user ?? null;
}

export async function signOut() {
  await apiCall(getAuthRoute("/signout"), {
    method: "POST",
    credentials: "include",
  });
  setAuthState(false);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("cwb:auth-changed"));
    window.location.assign("/");
  }
}

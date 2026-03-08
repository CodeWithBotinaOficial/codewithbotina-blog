export const AUTH_STATE_KEY = "cwb_auth_state";

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  if (!match) return null;
  return decodeURIComponent(match[1] || "").trim();
}

export function getAuthState(): boolean | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(AUTH_STATE_KEY);
  if (value === "1") return true;
  if (value === "0") return false;
  const cookieValue = getCookieValue(AUTH_STATE_KEY);
  if (cookieValue === "1") return true;
  if (cookieValue === "0") return false;
  return null;
}

export function setAuthState(value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STATE_KEY, value ? "1" : "0");
}

export function clearAuthState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STATE_KEY);
}

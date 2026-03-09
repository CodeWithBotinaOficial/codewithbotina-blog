export const AUTH_STATE_KEY = "cwb_auth_state";
const AUTH_STATE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const LOGGED_OUT_HINT_MAX_AGE_SECONDS = 60 * 5;

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  if (!match) return null;
  return decodeURIComponent(match[1] || "").trim();
}

function getStorageValue(name: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(name);
  } catch (_error) {
    return null;
  }
}

function setCookieValue(name: string, value: string, maxAgeSeconds: number) {
  if (typeof document === "undefined") return;
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
    `Expires=${new Date(Date.now() + (maxAgeSeconds * 1000)).toUTCString()}`,
  ];
  if (typeof window !== "undefined") {
    if (window.location?.protocol === "https:") {
      parts.push("Secure");
    }
    const hostname = window.location?.hostname;
    if (typeof hostname === "string" && hostname.endsWith("codewithbotina.com")) {
      parts.push("Domain=.codewithbotina.com");
    }
  }
  document.cookie = parts.join("; ");
}

function clearCookieValue(name: string) {
  if (typeof document === "undefined") return;
  const parts = [
    `${name}=`,
    "Path=/",
    "SameSite=Lax",
    "Max-Age=0",
    "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
  ];
  if (typeof window !== "undefined") {
    if (window.location?.protocol === "https:") {
      parts.push("Secure");
    }
    const hostname = window.location?.hostname;
    if (typeof hostname === "string" && hostname.endsWith("codewithbotina.com")) {
      parts.push("Domain=.codewithbotina.com");
    }
  }
  document.cookie = parts.join("; ");
}

export function getAuthState(): boolean | null {
  if (typeof window === "undefined") return null;
  const cookieValue = getCookieValue(AUTH_STATE_KEY);
  if (cookieValue === "1") return true;
  if (cookieValue === "0") return false;

  const storageValue = getStorageValue(AUTH_STATE_KEY);
  if (storageValue === "1") return true;

  return null;
}

export function setAuthState(value: boolean) {
  if (typeof window === "undefined") return;
  if (value) {
    window.localStorage.setItem(AUTH_STATE_KEY, "1");
    setCookieValue(AUTH_STATE_KEY, "1", AUTH_STATE_MAX_AGE_SECONDS);
    return;
  }

  window.localStorage.removeItem(AUTH_STATE_KEY);
  setCookieValue(AUTH_STATE_KEY, "0", LOGGED_OUT_HINT_MAX_AGE_SECONDS);
}

export function clearAuthState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STATE_KEY);
  clearCookieValue(AUTH_STATE_KEY);
}

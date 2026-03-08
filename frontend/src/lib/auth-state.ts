export const AUTH_STATE_KEY = "cwb_auth_state";

function getCookieValue(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]+)`));
  if (!match) return null;
  return decodeURIComponent(match[1] || "").trim();
}

function setCookieValue(name: string, value: string) {
  if (typeof document === "undefined") return;
  const parts = [`${name}=${encodeURIComponent(value)}`, "Path=/", "SameSite=Lax"];
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
  return false;
}

export function setAuthState(value: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(AUTH_STATE_KEY, value ? "1" : "0");
  setCookieValue(AUTH_STATE_KEY, value ? "1" : "0");
}

export function clearAuthState() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(AUTH_STATE_KEY);
  setCookieValue(AUTH_STATE_KEY, "0");
}

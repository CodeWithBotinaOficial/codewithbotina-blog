const AUTH_PROXY_BASE = "/api/auth";

export function getAuthRoute(path: string): string {
  if (!path) return AUTH_PROXY_BASE;
  return `${AUTH_PROXY_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

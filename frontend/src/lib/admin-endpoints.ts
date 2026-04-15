const ADMIN_PROXY_BASE = "/api/admin";

export function getAdminRoute(path: string): string {
  if (!path) return ADMIN_PROXY_BASE;
  return `${ADMIN_PROXY_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}


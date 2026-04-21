// Admin calls should go through the same-origin proxy at `/api/admin/*`.
// This avoids cross-origin credential/CORS issues and prevents HTML 404 pages
// from being parsed as JSON when a route is missing.
const ADMIN_PROXY_BASE = "/api/admin";

export function getAdminRoute(path: string): string {
  if (!path) return ADMIN_PROXY_BASE;
  return `${ADMIN_PROXY_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

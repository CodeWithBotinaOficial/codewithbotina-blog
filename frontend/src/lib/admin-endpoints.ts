// Use the real API base for admin endpoints. Some deployment setups used an
// admin proxy at `/api/admin`; to avoid 404 returning HTML (which caused the
// frontend JSON parse error), call the backend API directly at `/api`.
const ADMIN_PROXY_BASE = "/api";

export function getAdminRoute(path: string): string {
  if (!path) return ADMIN_PROXY_BASE;
  return `${ADMIN_PROXY_BASE}${path.startsWith("/") ? path : `/${path}`}`;
}


const NO_STORE_PATTERNS = [
  "/api/admin",
  "/api/auth",
  "/api/users",
  "/api/posts/publish-scheduled",
];

const CACHE_POLICIES: Array<
  { pattern: string; header: string; exact?: boolean }
> = [
  {
    pattern: "/api/tags",
    header: "public, max-age=300, stale-while-revalidate=60",
  },
  {
    pattern: "/api/reactions",
    header: "public, max-age=30, stale-while-revalidate=10",
  },
  {
    pattern: "/api/posts/search",
    header: "public, max-age=30, stale-while-revalidate=10",
  },
  {
    pattern: "/api/posts",
    header: "public, max-age=60, stale-while-revalidate=30",
    exact: true,
  },
  {
    pattern: "/api/search",
    header: "public, max-age=30, stale-while-revalidate=10",
  },
  {
    pattern: "/api/health",
    header: "no-cache",
  },
];

function matchesPath(pathname: string, pattern: string): boolean {
  return pathname === pattern || pathname.startsWith(`${pattern}/`);
}

export function getCacheHeader(
  url: URL,
  method: string,
  hasAuthCredentials = false,
): string | null {
  if (method !== "GET") return null;

  const pathname = url.pathname;
  if (
    hasAuthCredentials ||
    NO_STORE_PATTERNS.some((pattern) => matchesPath(pathname, pattern))
  ) {
    return "no-store";
  }

  if (/^\/api\/polls\/[^/]+\/results$/.test(pathname)) {
    return "public, max-age=60, stale-while-revalidate=30";
  }

  const match = CACHE_POLICIES
    .filter(({ pattern, exact }) =>
      exact ? pathname === pattern : matchesPath(pathname, pattern)
    )
    .sort((a, b) => b.pattern.length - a.pattern.length)[0];

  return match?.header ?? null;
}

function hasAuthCredentials(req: Request): boolean {
  if (req.headers.get("Authorization")?.trim()) return true;

  return (req.headers.get("Cookie") ?? "")
    .split(";")
    .some((cookie) => cookie.trim().startsWith("cwb_access="));
}

export function applyCacheHeaders(
  response: Response,
  req: Request,
  url: URL,
): Response {
  const cacheHeader = getCacheHeader(
    url,
    req.method,
    hasAuthCredentials(req),
  );
  if (
    cacheHeader &&
    (cacheHeader === "no-store" || !response.headers.has("Cache-Control"))
  ) {
    response.headers.set("Cache-Control", cacheHeader);
  }
  return response;
}

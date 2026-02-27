interface RateLimitRecord {
  count: number;
  startTime: number;
}

const RATE_LIMIT = 5; // Max requests per window
const WINDOW_MS = 60 * 1000; // 1 minute window
const AUTH_RATE_LIMIT = 6; // Max auth attempts per window
const AUTH_WINDOW_MS = 60 * 60 * 1000; // 1 hour window
const COMMENT_RATE_LIMIT = 10; // Max comments per user per window
const COMMENT_WINDOW_MS = 60 * 60 * 1000; // 1 hour window

// In-memory store (Note: In a distributed edge environment like Deno Deploy,
// this is local to the isolate. For strict global rate limiting, use Redis/KV)
const ipRequests = new Map<string, RateLimitRecord>();
const authIpRequests = new Map<string, RateLimitRecord>();
const userCommentRequests = new Map<string, RateLimitRecord>();

/**
 * Checks if the given IP address has exceeded the rate limit.
 * @param ip - The IP address of the client
 * @returns true if rate limited, false otherwise
 */
export function isRateLimited(ip: string): boolean {
  return isRateLimitedWithStore(ip, RATE_LIMIT, WINDOW_MS, ipRequests);
}

export function isAuthRateLimited(ip: string): boolean {
  return isRateLimitedWithStore(ip, AUTH_RATE_LIMIT, AUTH_WINDOW_MS, authIpRequests);
}

export function isUserCommentRateLimited(userId: string): boolean {
  return isRateLimitedWithStore(
    userId,
    COMMENT_RATE_LIMIT,
    COMMENT_WINDOW_MS,
    userCommentRequests,
  );
}

function isRateLimitedWithStore(
  ip: string,
  limit: number,
  windowMs: number,
  store: Map<string, RateLimitRecord>,
): boolean {
  const now = Date.now();
  const record = store.get(ip);

  if (!record) {
    store.set(ip, { count: 1, startTime: now });
    return false;
  }

  if (now - record.startTime > windowMs) {
    store.set(ip, { count: 1, startTime: now });
    return false;
  }

  if (record.count >= limit) {
    return true;
  }

  record.count++;
  return false;
}

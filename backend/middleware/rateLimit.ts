interface RateLimitRecord {
  count: number;
  startTime: number;
}

const RATE_LIMIT = 5; // Max requests per window
const WINDOW_MS = 60 * 1000; // 1 minute window

// In-memory store (Note: In a distributed edge environment like Deno Deploy,
// this is local to the isolate. For strict global rate limiting, use Redis/KV)
const ipRequests = new Map<string, RateLimitRecord>();

/**
 * Checks if the given IP address has exceeded the rate limit.
 * @param ip - The IP address of the client
 * @returns true if rate limited, false otherwise
 */
export function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = ipRequests.get(ip);

  // Clean up old entries periodically or lazily?
  // Lazy cleanup on access is simpler.

  if (!record) {
    ipRequests.set(ip, { count: 1, startTime: now });
    return false;
  }

  if (now - record.startTime > WINDOW_MS) {
    // Window expired, reset
    ipRequests.set(ip, { count: 1, startTime: now });
    return false;
  }

  if (record.count >= RATE_LIMIT) {
    return true;
  }

  record.count++;
  return false;
}

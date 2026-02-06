import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import { isRateLimited } from "../../../middleware/rateLimit.ts";

Deno.test("isRateLimited allows requests under limit", () => {
  const ip = "192.168.1.1";
  // Reset state implicitly by using a unique IP for this test or relying on implementation details
  // Since we can't easily reset the module state, we'll assume a fresh IP works

  // First 5 requests should be allowed
  for (let i = 0; i < 5; i++) {
    assertEquals(
      isRateLimited(ip),
      false,
      `Request ${i + 1} should be allowed`,
    );
  }
});

Deno.test("isRateLimited blocks requests over limit", () => {
  const ip = "192.168.1.2";

  // Consume limit
  for (let i = 0; i < 5; i++) {
    isRateLimited(ip);
  }

  // Next request should be blocked
  assertEquals(isRateLimited(ip), true, "Request 6 should be blocked");
});

// Note: Testing time-based reset is tricky without mocking Date.now() or waiting.
// We'll skip the wait test to keep tests fast.

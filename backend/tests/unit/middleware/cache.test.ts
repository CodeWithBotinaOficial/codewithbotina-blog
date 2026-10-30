import { assertEquals } from "https://deno.land/std@0.216.0/assert/mod.ts";
import {
  applyCacheHeaders,
  getCacheHeader,
} from "../../../middleware/cache.ts";

Deno.test("getCacheHeader - tags route returns 5min cache", () => {
  const url = new URL("https://api.codewithbotina.com/api/tags");
  assertEquals(
    getCacheHeader(url, "GET"),
    "public, max-age=300, stale-while-revalidate=60",
  );
});

Deno.test("getCacheHeader - posts list returns 1min cache", () => {
  const url = new URL("https://api.codewithbotina.com/api/posts");
  assertEquals(
    getCacheHeader(url, "GET"),
    "public, max-age=60, stale-while-revalidate=30",
  );
});

Deno.test("getCacheHeader - post detail is handled by its route", () => {
  const url = new URL("https://api.codewithbotina.com/api/posts/hello");
  assertEquals(getCacheHeader(url, "GET"), null);
});

Deno.test("getCacheHeader - post search uses its shorter cache policy", () => {
  const url = new URL("https://api.codewithbotina.com/api/posts/search");
  assertEquals(
    getCacheHeader(url, "GET"),
    "public, max-age=30, stale-while-revalidate=10",
  );
});

Deno.test("getCacheHeader - auth routes return no-store", () => {
  const url = new URL("https://api.codewithbotina.com/api/auth/me");
  assertEquals(getCacheHeader(url, "GET"), "no-store");
});

Deno.test("getCacheHeader - admin and user routes return no-store", () => {
  for (const pathname of ["/api/admin/posts", "/api/users/profile"]) {
    assertEquals(
      getCacheHeader(
        new URL(`https://api.codewithbotina.com${pathname}`),
        "GET",
      ),
      "no-store",
    );
  }
});

Deno.test("getCacheHeader - authenticated requests are not cached", () => {
  const url = new URL("https://api.codewithbotina.com/api/posts");
  assertEquals(getCacheHeader(url, "GET", true), "no-store");
});

Deno.test("getCacheHeader - reactions and polls have short cache policies", () => {
  assertEquals(
    getCacheHeader(
      new URL("https://api.codewithbotina.com/api/reactions/post-1"),
      "GET",
    ),
    "public, max-age=30, stale-while-revalidate=10",
  );
  assertEquals(
    getCacheHeader(
      new URL("https://api.codewithbotina.com/api/polls/poll-1/results"),
      "GET",
    ),
    "public, max-age=60, stale-while-revalidate=30",
  );
  assertEquals(
    getCacheHeader(new URL("https://api.codewithbotina.com/api/polls"), "GET"),
    null,
  );
});

Deno.test("getCacheHeader - mutations return null", () => {
  const url = new URL("https://api.codewithbotina.com/api/posts");
  for (const method of ["POST", "PUT", "DELETE", "PATCH"]) {
    assertEquals(getCacheHeader(url, method), null);
  }
});

Deno.test("applyCacheHeaders - authenticated responses override public cache", () => {
  const url = new URL("https://api.codewithbotina.com/api/posts");
  const req = new Request(url, {
    headers: { Cookie: "cwb_access=token" },
  });
  const response = new Response(null, {
    headers: { "Cache-Control": "public, max-age=60" },
  });

  assertEquals(
    applyCacheHeaders(response, req, url).headers.get("Cache-Control"),
    "no-store",
  );
});

Deno.test("getCacheHeader - health returns no-cache", () => {
  const url = new URL("https://api.codewithbotina.com/api/health");
  assertEquals(getCacheHeader(url, "GET"), "no-cache");
});

Deno.test("getCacheHeader - similar route prefixes do not match", () => {
  const url = new URL("https://api.codewithbotina.com/api/posts-extra");
  assertEquals(getCacheHeader(url, "GET"), null);
});

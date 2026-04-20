import type { Handlers } from "$fresh/server.ts";
import { handler as postsSearchHandler } from "./posts/search.ts";

// Lightweight compatibility route so clients calling `/api/search` (older paths
// or external integrations) receive the same JSON payload as
// `/api/posts/search`. This prevents accidental HTML 404 pages from being
// returned and causing "Unexpected token '<'" JSON parse errors.
export const handler: Handlers = {
  OPTIONS(req) {
    // Delegate to posts search OPTIONS if available.
    if (typeof postsSearchHandler.OPTIONS === "function") {
      return postsSearchHandler.OPTIONS(req as Request, undefined as any);
    }
    return new Response(null, { status: 204 });
  },

  async GET(req) {
    // Simply delegate to the posts search handler so the logic and headers
    // remain identical.
    if (typeof postsSearchHandler.GET === "function") {
      return await postsSearchHandler.GET(req as Request, undefined as any);
    }
    return new Response(JSON.stringify({ success: false, error: "Not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  },
};


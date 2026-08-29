import { Handlers } from "$fresh/server.ts";
import { PostService } from "../../../services/post.service.ts";
import { errorResponse, successResponse } from "../../../utils/responses.ts";
import { corsHeaders } from "../../../middleware/cors.ts";

const postService = new PostService();

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  },

  // GET /api/posts/publish-scheduled — Publish all posts whose scheduled_at has arrived
  async GET(req) {
    try {
      // Validate cron secret
      const cronSecret = Deno.env.get("CRON_SECRET");
      if (!cronSecret) {
        console.error("[publish-scheduled] CRON_SECRET not configured");
        return errorResponse("Server misconfiguration", 500);
      }

      const authHeader = req.headers.get("Authorization");
      const token = authHeader?.replace("Bearer ", "");

      if (!token || token !== cronSecret) {
        console.warn("[publish-scheduled] Unauthorized attempt");
        return errorResponse("Unauthorized", 401);
      }

      const result = await postService.publishScheduledPosts();

      console.log(`[publish-scheduled] Done. Published: ${result.published}`);

      return successResponse({
        published: result.published,
        slugs: result.slugs,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("[publish-scheduled] Error:", error);
      return errorResponse("Failed to publish scheduled posts", 500);
    }
  },
};

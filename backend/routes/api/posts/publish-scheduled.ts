import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { postService } from "../../../services/post.service.ts";
import { errorResponse, successResponse } from "../../../utils/responses.ts";

/**
 * GET /api/posts/publish-scheduled
 *
 * Protected endpoint for publishing scheduled posts.
 * Called by GitHub Actions workflow every 5 minutes.
 *
 * Security:
 * - Requires CRON_SECRET in Authorization header as Bearer token
 * - Only GET method allowed (no state-changing operations)
 *
 * Response:
 * - 200: { published: number, slugs: string[] }
 * - 401: Missing or invalid CRON_SECRET
 * - 500: Database or processing error
 */

function verifyCronSecret(req: Request): boolean {
  const cronSecret = Deno.env.get("CRON_SECRET");

  if (!cronSecret) {
    console.error("CRON_SECRET environment variable not set");
    return false;
  }

  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    return false;
  }

  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    return false;
  }

  const token = match[1];
  return token === cronSecret;
}

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  },

  async GET(req: Request) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);

    try {
      // Verify CRON_SECRET
      const isAuthorized = verifyCronSecret(req);
      if (!isAuthorized) {
        const response = errorResponse("Unauthorized", 401);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      // Log cron job execution
      console.log("Publishing scheduled posts...");
      const startTime = Date.now();

      // Publish all posts where scheduled_at <= NOW()
      const result = await postService.publishScheduledPosts();

      const duration = Date.now() - startTime;
      console.log(
        `Published ${result.published} post(s) in ${duration}ms`,
        result.slugs,
      );

      const response = successResponse(
        {
          published: result.published,
          slugs: result.slugs,
          duration_ms: duration,
        },
        `Successfully published ${result.published} scheduled post(s)`,
        200,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Internal server error";
      console.error("Error publishing scheduled posts:", message);
      const response = errorResponse(message, 500);
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },
};

import { type FreshContext, type Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../../middleware/cors.ts";
import { requireAdmin } from "../../../../middleware/auth.ts";
import { validateScheduledAt } from "../../../../lib/validation.ts";
import { postService } from "../../../../services/post.service.ts";
import type { SchedulePostInput } from "../../../../types/post.types.ts";
import { errorResponse, successResponse } from "../../../../utils/responses.ts";

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  },

  async POST(req: Request, ctx: FreshContext) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);

    try {
      // Check authentication and admin status
      const user = await requireAdmin(req);
      if (!user) {
        const response = errorResponse("Unauthorized", 401);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const { slug } = ctx.params;

      // Parse and validate request body
      let body: SchedulePostInput;
      try {
        body = await req.json();
      } catch {
        const response = errorResponse("Invalid JSON in request body", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      // Validate scheduled_at field exists
      if (!body.scheduled_at) {
        const response = errorResponse("scheduled_at is required", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      // Validate the scheduled date
      const validation = validateScheduledAt(body.scheduled_at);
      if (!validation.valid) {
        const response = errorResponse(
          validation.error || "Invalid scheduled date",
          400,
        );
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      // Schedule the post
      const post = await postService.schedulePost(
        slug,
        body.scheduled_at,
        user.id,
      );

      const response = successResponse(
        post,
        "Post scheduled successfully",
        200,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Internal server error";
      const response = errorResponse(message, 500);
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },

  async DELETE(req: Request, ctx: FreshContext) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);

    try {
      // Check authentication and admin status
      const user = await requireAdmin(req);
      if (!user) {
        const response = errorResponse("Unauthorized", 401);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const { slug } = ctx.params;

      // Unschedule the post
      const post = await postService.unschedulePost(slug);

      const response = successResponse(
        post,
        "Post schedule cancelled",
        200,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Internal server error";
      const response = errorResponse(message, 500);
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },
};

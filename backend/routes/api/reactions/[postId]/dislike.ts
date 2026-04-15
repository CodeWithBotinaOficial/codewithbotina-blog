import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../../middleware/cors.ts";
import { requireAuth } from "../../../../middleware/auth.ts";
import { AppError } from "../../../../utils/errors.ts";
import { errorResponse } from "../../../../utils/responses.ts";
import { toggleReaction } from "../../../../lib/reactions.helpers.ts";

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  },

  async POST(req, ctx) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const { postId } = ctx.params;

    try {
      const user = await requireAuth(req);
      const result = await toggleReaction(postId, user.id, "dislike");

      headers.set("Content-Type", "application/json");
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            reaction: result.reaction,
            counts: result.counts,
          },
        }),
        { status: 200, headers },
      );
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      const response = errorResponse(
        error instanceof Error ? error.message : "Internal server error",
        statusCode,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },
};

import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../../middleware/cors.ts";
import { requireAuth } from "../../../../middleware/auth.ts";
import { AppError } from "../../../../utils/errors.ts";
import { errorResponse } from "../../../../utils/responses.ts";
import { getUserReaction } from "../../../../lib/reactions.helpers.ts";

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  },

  async GET(req, ctx) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const { postId } = ctx.params;

    try {
      const user = await requireAuth(req);
      const reaction = await getUserReaction(postId, user.id);

      headers.set("Content-Type", "application/json");
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            user_reaction: reaction,
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

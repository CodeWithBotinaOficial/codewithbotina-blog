import { Handlers } from "$fresh/server.ts";
import { CommentService } from "../../../../services/comment.service.ts";
import { corsHeaders } from "../../../../middleware/cors.ts";
import { requireAdmin } from "../../../../middleware/auth.ts";
import { AppError } from "../../../../utils/errors.ts";
import { errorResponse } from "../../../../utils/responses.ts";

const commentService = new CommentService();

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
    const { commentId } = ctx.params;

    try {
      const user = await requireAdmin(req);
      const result = await commentService.unpinComment(commentId, user.id);

      if (!result.success || !result.data) {
        const statusCode = result.error instanceof AppError
          ? result.error.statusCode
          : 500;
        const response = errorResponse(
          result.error?.message || "Internal server error",
          statusCode,
        );
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      headers.set("Content-Type", "application/json");
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            id: result.data.id,
            is_pinned: result.data.is_pinned,
            updated_at: result.data.updated_at,
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

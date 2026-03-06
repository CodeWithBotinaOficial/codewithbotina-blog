import { Handlers } from "$fresh/server.ts";
import { PostService } from "../../../../services/post.service.ts";
import { corsHeaders } from "../../../../middleware/cors.ts";
import { requireAdmin } from "../../../../middleware/auth.ts";
import { AppError } from "../../../../utils/errors.ts";
import { errorResponse, successResponse } from "../../../../utils/responses.ts";

const postService = new PostService();

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  },

  async DELETE(req, ctx) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const { slug } = ctx.params;
    const params = new URL(req.url).searchParams;
    const confirm = params.get("confirm") === "true";
    const language = params.get("language") ?? undefined;

    try {
      const user = await requireAdmin(req);

      if (!confirm) {
        const info = await postService.getDeleteInfo(slug, language);
        const response = successResponse(
          {
            post_id: info.post_id,
            titulo: info.titulo,
            comments_count: info.comments_count,
            reactions_count: info.reactions_count,
            likes_count: info.likes_count,
            dislikes_count: info.dislikes_count,
            imagen_url: info.imagen_url,
            requires_confirmation: true,
          },
          "Confirmation required",
          200,
        );
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const result = await postService.deletePost(slug, user.id, language);
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

      const response = successResponse(
        {
          post_id: result.data.post_id,
          comments_deleted: result.data.comments_deleted,
          reactions_deleted: result.data.reactions_deleted,
        },
        "Post deleted successfully",
        200,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
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

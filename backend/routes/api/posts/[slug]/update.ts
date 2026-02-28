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

  async PUT(req, ctx) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const { slug } = ctx.params;

    try {
      const user = await requireAdmin(req);
      let body;
      try {
        body = await req.json();
      } catch (_error) {
        const response = errorResponse("Invalid JSON body", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const result = await postService.updatePost(slug, body, user.id);
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
          id: result.data.id,
          titulo: result.data.titulo,
          slug: result.data.slug,
        },
        "Post updated successfully",
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

import { Handlers } from "$fresh/server.ts";
import { PostService } from "../../../../services/post.service.ts";
import { corsHeaders } from "../../../../middleware/cors.ts";
import { AppError } from "../../../../utils/errors.ts";
import { errorResponse } from "../../../../utils/responses.ts";

const postService = new PostService();

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
    const { slug } = ctx.params;
    const language = new URL(req.url).searchParams.get("language") ?? undefined;

    try {
      const isUnique = await postService.isSlugUnique(slug, undefined, language ?? undefined);
      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ exists: !isUnique }), {
        status: 200,
        headers,
      });
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

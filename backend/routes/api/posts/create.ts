import { Handlers } from "$fresh/server.ts";
import { PostService } from "../../../services/post.service.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { requireAdmin } from "../../../middleware/auth.ts";
import { AppError } from "../../../utils/errors.ts";
import { errorResponse, successResponse } from "../../../utils/responses.ts";

const postService = new PostService();

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  },

  async POST(req) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);

    try {
      console.log("Create post called", {
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url,
      });

      console.log("Create post auth header present:", Boolean(req.headers.get("Authorization")));

      const user = await requireAdmin(req);
      console.log("Create post admin verified", {
        userId: user.id,
        email: user.email ?? null,
      });

      let body;
      try {
        body = await req.json();
      } catch (_error) {
        const response = errorResponse("Invalid JSON body", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      console.log("Create post request received", {
        titulo: body?.titulo,
        slug: body?.slug,
        bodyLength: typeof body?.body === "string" ? body.body.length : 0,
        hasImage: Boolean(body?.imagen_url),
      });

      const result = await postService.createPost(body, user.id);
      if (!result.success || !result.data) {
        console.error("Create post failed", result.error);
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

      console.log("Create post succeeded", {
        postId: result.data.id,
        slug: result.data.slug,
      });

      const response = successResponse(
        {
          id: result.data.id,
          titulo: result.data.titulo,
          slug: result.data.slug,
          fecha: result.data.fecha,
        },
        "Post created successfully",
        201,
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

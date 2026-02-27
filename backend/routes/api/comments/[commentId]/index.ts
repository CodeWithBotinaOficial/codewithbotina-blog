import { Handlers } from "$fresh/server.ts";
import { CommentService } from "../../../../services/comment.service.ts";
import { corsHeaders } from "../../../../middleware/cors.ts";
import { requireAuth } from "../../../../middleware/auth.ts";
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

  async GET(req, ctx) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const { commentId: postId } = ctx.params;

    try {
      const result = await commentService.getPostComments(postId);
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

      const pinnedCount = result.data.filter((comment) => comment.is_pinned)
        .length;

      headers.set("Content-Type", "application/json");
      return new Response(
        JSON.stringify({
          success: true,
          data: result.data,
          meta: {
            total: result.data.length,
            pinned_count: pinnedCount,
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

  async POST(req, ctx) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const { commentId: postId } = ctx.params;

    try {
      const user = await requireAuth(req);
      let body;
      try {
        body = await req.json();
      } catch (_error) {
        const response = errorResponse("Invalid JSON body", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const content = typeof body?.content === "string" ? body.content : "";
      const result = await commentService.createComment(
        postId,
        user.id,
        content,
      );

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
          data: result.data,
        }),
        { status: 201, headers },
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

  async PUT(req, ctx) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const { commentId } = ctx.params;

    try {
      const user = await requireAuth(req);
      let body;
      try {
        body = await req.json();
      } catch (_error) {
        const response = errorResponse("Invalid JSON body", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const content = typeof body?.content === "string" ? body.content : "";
      const result = await commentService.updateComment(
        commentId,
        user.id,
        content,
      );

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
        JSON.stringify({ success: true, data: result.data }),
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

  async DELETE(req, ctx) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const { commentId } = ctx.params;

    try {
      const user = await requireAuth(req);
      const result = await commentService.deleteComment(
        commentId,
        user.id,
        Boolean(user.is_admin),
      );

      if (!result.success) {
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
          message: "Comment deleted successfully",
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

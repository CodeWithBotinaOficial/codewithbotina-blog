import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../../../middleware/cors.ts";
import { requireAdmin } from "../../../../../middleware/auth.ts";
import { AppError } from "../../../../../utils/errors.ts";
import {
  errorResponse,
  successResponse,
} from "../../../../../utils/responses.ts";
import { PostTranslationService } from "../../../../../services/post-translation.service.ts";

const service = new PostTranslationService();

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  },

  async GET(req, ctx) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const postId = ctx.params.slug; // route param name is "slug", but this endpoint expects a post UUID

    try {
      const result = await service.getTranslations(postId);
      if (!result.success) {
        const statusCode = result.error instanceof AppError
          ? result.error.statusCode
          : 400;
        const response = errorResponse(
          result.error?.message || "Failed to fetch translations",
          statusCode,
        );
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const response = successResponse(
        { translations: result.data ?? [] },
        "Translations fetched successfully",
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

  async POST(req, ctx) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const postId = ctx.params.slug; // expects UUID

    try {
      await requireAdmin(req);

      let body: unknown;
      try {
        body = await req.json();
      } catch (_error) {
        const response = errorResponse("Invalid JSON body", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const payload = (body && typeof body === "object")
        ? body as Record<string, unknown>
        : {};
      const linkedPostIdsRaw = Array.isArray(payload.linked_post_ids)
        ? payload.linked_post_ids
        : [];
      const linkedPostIds = linkedPostIdsRaw.filter((v): v is string =>
        typeof v === "string"
      );
      const result = await service.linkTranslations(postId, linkedPostIds);
      if (!result.success || !result.data) {
        const statusCode = result.error instanceof AppError
          ? result.error.statusCode
          : 400;
        const response = errorResponse(
          result.error?.message || "Failed to link translations",
          statusCode,
        );
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const response = successResponse(
        result.data,
        "Translations linked successfully",
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

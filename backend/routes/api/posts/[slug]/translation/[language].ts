import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../../../middleware/cors.ts";
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
    const postId = ctx.params.slug; // expects UUID
    const language = ctx.params.language;

    try {
      const result = await service.getTranslationForLanguage(postId, language);
      if (!result.success) {
        const statusCode = result.error instanceof AppError
          ? result.error.statusCode
          : 400;
        const response = errorResponse(
          result.error?.message || "Failed to fetch translation",
          statusCode,
        );
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      if (!result.data) {
        const response = errorResponse("Translation not found", 404);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const response = successResponse(
        result.data,
        "Translation fetched successfully",
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

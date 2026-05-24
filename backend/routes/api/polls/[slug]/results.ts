import { Handlers } from "$fresh/server.ts";
import { pollRepository } from "../../../../repositories/poll.repository.ts";
import { corsHeaders } from "../../../../middleware/cors.ts";
import { AppError } from "../../../../utils/errors.ts";
import { errorResponse, successResponse } from "../../../../utils/responses.ts";

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  },

  async GET(req, ctx) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const { slug } = ctx.params;
    const url = new URL(req.url);
    const language = url.searchParams.get("lang") ?? "en";

    try {
      const poll = await pollRepository.getPollBySlug(slug, language);
      if (!poll) {
        const response = errorResponse("Poll not found", 404);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const results = await pollRepository.getPollWithResults(poll.id);
      const response = successResponse(results, "Poll results", 200);
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

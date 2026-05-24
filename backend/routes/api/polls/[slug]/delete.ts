import { Handlers } from "$fresh/server.ts";
import { requireAdmin } from "../../../../middleware/auth.ts";
import { pollRepository } from "../../../../repositories/poll.repository.ts";
import { corsHeaders } from "../../../../middleware/cors.ts";
import { AppError } from "../../../../utils/errors.ts";
import { errorResponse, successResponse } from "../../../../utils/responses.ts";

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  },

  async DELETE(req, ctx) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const { slug } = ctx.params;
    const url = new URL(req.url);
    const language = url.searchParams.get("lang") ?? "en";

    try {
      await requireAdmin(req);

      const poll = await pollRepository.getPollBySlug(slug, language);
      if (!poll) {
        const response = errorResponse("Poll not found", 404);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      // Optional confirmation slug in body
      let body = {};
      try {
        body = await req.json();
      } catch (_e) {
        /* ignore */
      }

      if (body?.confirm_slug && body.confirm_slug !== slug) {
        const response = errorResponse("Slug confirmation mismatch", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      await pollRepository.deletePoll(poll.id);
      const response = successResponse({ deleted: true }, "Poll deleted", 200);
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 400;
      const response = errorResponse(
        error instanceof Error ? error.message : "Internal server error",
        statusCode,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },
};


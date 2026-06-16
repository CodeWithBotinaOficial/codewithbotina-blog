import { Handlers } from "$fresh/server.ts";
import { pollRepository } from "../../../../repositories/poll.repository.ts";
import { corsHeaders } from "../../../../middleware/cors.ts";
import { AppError } from "../../../../utils/errors.ts";
import { errorResponse } from "../../../../utils/responses.ts";

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
    const excludeId = url.searchParams.get("excludeId") ?? undefined;

    try {
      const poll = await pollRepository.findPollBySlug(slug, language);
      const exists = Boolean(poll && (!excludeId || poll.id !== excludeId));

      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify({ exists }), {
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

import { Handlers } from "$fresh/server.ts";
import { requireAdmin } from "../../../../middleware/auth.ts";
import { corsHeaders } from "../../../../middleware/cors.ts";
import { pollRepository } from "../../../../repositories/poll.repository.ts";
import { AppError } from "../../../../utils/errors.ts";
import { errorResponse, successResponse } from "../../../../utils/responses.ts";

async function getPollBySlug(slug: string, language: string | null) {
  if (language) return await pollRepository.getPollBySlug(slug, language);

  const supportedLanguages = ["en", "es", "pt-br"];
  for (const lang of supportedLanguages) {
    const poll = await pollRepository.getPollBySlug(slug, lang);
    if (poll) return poll;
  }
  return null;
}

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  },

  async POST(req, ctx) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const { slug } = ctx.params;
    const url = new URL(req.url);
    const language = url.searchParams.get("lang");

    try {
      await requireAdmin(req);
      const poll = await getPollBySlug(slug, language);
      if (!poll) {
        const response = errorResponse("Poll not found", 404);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      await pollRepository.unlinkPollTranslation(poll.id);
      const response = successResponse(
        { unlinked: true },
        "Poll unlinked",
        200,
      );
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

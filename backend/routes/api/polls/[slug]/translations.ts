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

  async GET(req, ctx) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const { slug } = ctx.params;
    const url = new URL(req.url);
    const language = url.searchParams.get("lang");

    try {
      const poll = await getPollBySlug(slug, language);
      if (!poll) {
        const response = errorResponse("Poll not found", 404);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const translations = await pollRepository.getPollTranslations(poll.id);
      const response = successResponse(translations, "Poll translations", 200);
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
    const { slug } = ctx.params;
    const url = new URL(req.url);
    const language = url.searchParams.get("lang");

    try {
      await requireAdmin(req);
      const body = await req.json() as {
        linkedSlug?: string;
        linkedLanguage?: string;
      };
      const linkedSlug = String(body.linkedSlug ?? "");
      if (!linkedSlug) {
        const response = errorResponse("linkedSlug is required", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const poll = await getPollBySlug(slug, language);
      const linkedPoll = await getPollBySlug(
        linkedSlug,
        body.linkedLanguage ?? null,
      );
      if (!poll || !linkedPoll) {
        const response = errorResponse("One or both polls not found", 404);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const translationGroupId = await pollRepository.linkPollTranslation(
        poll.id,
        linkedPoll.id,
      );
      const response = successResponse(
        { translation_group_id: translationGroupId },
        "Polls linked",
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

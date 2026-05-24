import { Handlers } from "$fresh/server.ts";
import { requireAdmin } from "../../../../../middleware/auth.ts";
import { pollRepository } from "../../../../../repositories/poll.repository.ts";
import { corsHeaders } from "../../../../../middleware/cors.ts";
import { AppError } from "../../../../../utils/errors.ts";
import {
  errorResponse,
  successResponse,
} from "../../../../../utils/responses.ts";

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
    const language = url.searchParams.get("lang") ?? "en";

    try {
      await requireAdmin(req);

      const poll = await pollRepository.getPollBySlug(slug, language);
      if (!poll) {
        const response = errorResponse("Poll not found", 404);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      let body;
      try {
        body = await req.json();
      } catch (_error) {
        const response = errorResponse("Invalid JSON body", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const optionText = typeof body?.option_text === "string"
        ? body.option_text
        : "";
      if (!optionText.trim()) {
        const response = errorResponse("Option text required", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const displayOrder = Number.isInteger(body?.display_order)
        ? body.display_order
        : (poll.poll_options?.length ?? 0) + 1;

      const option = await pollRepository.addOption({
        poll_id: poll.id,
        option_text: optionText.trim(),
        display_order: displayOrder,
        color: body?.color,
      });

      const response = successResponse(option, "Option added", 201);
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

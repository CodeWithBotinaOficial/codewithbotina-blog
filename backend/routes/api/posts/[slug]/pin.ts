import { Handlers } from "$fresh/server.ts";
import { supabase } from "../../../../lib/supabase.ts";
import { corsHeaders } from "../../../../middleware/cors.ts";
import { requireAdmin } from "../../../../middleware/auth.ts";
import { AppError, ValidationError } from "../../../../utils/errors.ts";
import { errorResponse, successResponse } from "../../../../utils/responses.ts";

const SUPPORTED_LANGUAGES = new Set([
  "en",
  "es",
  "fr",
  "de",
  "pt",
  "pt-br",
  "ja",
  "zh",
]);

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  },

  async POST(req, ctx) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const { slug } = ctx.params;

    try {
      await requireAdmin(req);
      if (!slug) throw new ValidationError("Missing slug");

      const url = new URL(req.url);
      const language = url.searchParams.get("language") ?? "";
      if (language && !SUPPORTED_LANGUAGES.has(language)) {
        throw new ValidationError("Unsupported language");
      }

      let fetchQ = supabase
        .from("posts")
        .select("id, is_pinned")
        .eq("slug", slug);
      if (language) fetchQ = fetchQ.eq("language", language);

      const { data: existing, error: fetchError } = await fetchQ.maybeSingle();
      if (fetchError) {
        console.error("Supabase error:", fetchError);
        throw new AppError("Failed to fetch post", 500);
      }
      if (!existing) throw new AppError("Post not found", 404);

      const nextPinned = !existing.is_pinned;
      const { data: updated, error } = await supabase
        .from("posts")
        .update({ is_pinned: nextPinned })
        .eq("id", existing.id)
        .select("id, slug, language, is_pinned")
        .single();

      if (error || !updated) {
        console.error("Supabase error:", error);
        throw new AppError("Failed to update pin status", 500);
      }

      const response = successResponse(
        { is_pinned: Boolean(updated.is_pinned), post: updated },
        "Pin status updated",
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

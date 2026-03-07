import { Handlers } from "$fresh/server.ts";
import { supabase } from "../../../../lib/supabase.ts";
import { corsHeaders } from "../../../../middleware/cors.ts";
import { AppError, ValidationError } from "../../../../utils/errors.ts";
import { errorResponse, successResponse } from "../../../../utils/responses.ts";

const SUPPORTED_LANGUAGES = new Set(["en", "es", "fr", "de", "pt", "ja", "zh"]);

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
    const language = url.searchParams.get("language") ?? "";

    try {
      if (!slug) {
        throw new ValidationError("Missing slug");
      }

      if (language && !SUPPORTED_LANGUAGES.has(language)) {
        throw new ValidationError("Unsupported language");
      }

      let query = supabase
        .from("posts")
        .select(`
          id,
          titulo,
          slug,
          body,
          imagen_url,
          fecha,
          updated_at,
          language,
          post_tags (
            tag:tags (
              id,
              name,
              slug,
              usage_count
            )
          )
        `)
        .eq("slug", slug);

      if (language) {
        query = query.eq("language", language);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        console.error("Supabase error:", error);
        throw new AppError("Failed to fetch post", 500);
      }

      if (!data) {
        throw new AppError("Post not found", 404);
      }

      const tags = Array.isArray(data.post_tags)
        ? data.post_tags
          .map((item) => item.tag)
          .filter(Boolean)
        : [];

      const payload = {
        id: data.id,
        titulo: data.titulo,
        slug: data.slug,
        body: data.body,
        imagen_url: data.imagen_url,
        fecha: data.fecha,
        updated_at: data.updated_at,
        language: data.language,
        tags,
      };

      const response = successResponse(payload, "Post fetched successfully", 200);
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

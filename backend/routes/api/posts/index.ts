import { Handlers } from "$fresh/server.ts";
import { supabase } from "../../../lib/supabase.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { AppError, ValidationError } from "../../../utils/errors.ts";
import { errorResponse, successResponse } from "../../../utils/responses.ts";

const SUPPORTED_LANGUAGES = new Set(["en", "es", "fr", "de", "pt", "ja", "zh"]);
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  },

  async GET(req) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const url = new URL(req.url);
    const language = url.searchParams.get("language") ?? "";
    const limitParam = url.searchParams.get("limit");
    const offsetParam = url.searchParams.get("offset");

    try {
      if (language && !SUPPORTED_LANGUAGES.has(language)) {
        throw new ValidationError("Unsupported language");
      }

      const limit = Math.min(
        Math.max(Number.parseInt(limitParam ?? `${DEFAULT_LIMIT}`, 10) || DEFAULT_LIMIT, 1),
        MAX_LIMIT,
      );
      const offset = Math.max(Number.parseInt(offsetParam ?? "0", 10) || 0, 0);

      let query = supabase
        .from("posts")
        .select("id, titulo, slug, body, imagen_url, fecha, language")
        .order("fecha", { ascending: false });

      if (language) {
        query = query.eq("language", language);
      }

      const { data, error } = await query.range(offset, offset + limit - 1);

      if (error) {
        console.error("Supabase error:", error);
        throw new AppError("Failed to fetch posts", 500);
      }

      const posts = (data ?? []).map((post) => ({
        ...post,
        updated_at: (post as { updated_at?: string | null }).updated_at ?? post.fecha ?? null,
      }));

      const response = successResponse(
        { posts, limit, offset },
        "Posts fetched successfully",
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

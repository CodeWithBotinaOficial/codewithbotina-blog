import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { supabase } from "../../../lib/supabase.ts";
import { errorResponse, successResponse } from "../../../utils/responses.ts";

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  },

  async GET(req, ctx) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const url = new URL(req.url);
    const languageParam = url.searchParams.get("language");
    const normalizedLanguage = languageParam
      ? languageParam.trim().toLowerCase()
      : null;
    const supportedLanguages = new Set([
      "en",
      "es",
      "fr",
      "de",
      "pt",
      "ja",
      "zh",
    ]);
    const language =
      normalizedLanguage && supportedLanguages.has(normalizedLanguage)
        ? normalizedLanguage
        : null;
    const allowedPerPage = new Set([10, 50, 100]);
    const limitRaw = Number(url.searchParams.get("limit") ?? "20");
    const offsetRaw = Number(url.searchParams.get("offset") ?? "0");
    const limit = Number.isFinite(limitRaw) && allowedPerPage.has(limitRaw)
      ? Math.trunc(limitRaw)
      : 20;
    const offset = Number.isFinite(offsetRaw)
      ? Math.max(0, Math.trunc(offsetRaw))
      : 0;

    try {
      const slug = ctx.params.slug?.trim();
      if (!slug) {
        const response = errorResponse("Tag slug is required", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const { data: tag, error: tagError } = await supabase
        .from("tags")
        // Some environments do not have tags.updated_at; only select stable columns.
        .select("id, name, slug, description, created_at")
        .eq("slug", slug)
        .maybeSingle();

      if (tagError) {
        const response = errorResponse("Failed to fetch tag", 500);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      if (!tag) {
        const response = errorResponse("Tag not found", 404);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      let countQuery = supabase
        .from("posts")
        .select("id, post_tags!inner(tag_id)", { count: "exact", head: true })
        .eq("post_tags.tag_id", tag.id);

      let postsQuery = supabase
        .from("posts")
        .select(
          "id, titulo, slug, body, imagen_url, fecha, language, post_tags!inner(tag_id)",
        )
        .eq("post_tags.tag_id", tag.id)
        .order("fecha", { ascending: false })
        .range(offset, offset + limit - 1);

      if (language) {
        countQuery = countQuery.eq("language", language);
        postsQuery = postsQuery.eq("language", language);
      }

      const [
        { count: total_posts, error: countErr },
        { data, error: postsErr },
      ] = await Promise.all([countQuery, postsQuery]);

      if (countErr || postsErr) {
        console.error("Supabase error:", countErr || postsErr);
        const response = errorResponse("Failed to fetch tag posts", 500);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      type PostRow = {
        id: string;
        titulo: string;
        slug: string;
        body: string;
        imagen_url: string | null;
        fecha: string | null;
        language: string;
      };

      const posts = ((data ?? []) as unknown as PostRow[]).map((row) => ({
        id: row.id,
        titulo: row.titulo,
        slug: row.slug,
        body: row.body,
        imagen_url: row.imagen_url,
        fecha: row.fecha,
        language: row.language,
      }));

      const response = successResponse({
        tag,
        posts,
        total_posts: total_posts ?? 0,
      });
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      const response = errorResponse(
        error instanceof Error ? error.message : "Failed to fetch tag",
        500,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },
};

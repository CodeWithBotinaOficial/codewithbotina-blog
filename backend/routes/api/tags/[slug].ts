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

    try {
      const slug = ctx.params.slug?.trim();
      if (!slug) {
        const response = errorResponse("Tag slug is required", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const { data: tag, error: tagError } = await supabase
        .from("tags")
        .select("id, name, slug, description, updated_at, created_at")
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

      let postTags:
        | Array<{ post?: unknown }>
        | null = null;

      const withUpdated = await supabase
        .from("post_tags")
        .select(`
          post:posts (
            id,
            titulo,
            slug,
            body,
            imagen_url,
            fecha,
            updated_at
          )
        `)
        .eq("tag_id", tag.id)
        .order("created_at", { ascending: false });

      if (withUpdated.error) {
        const message = String(withUpdated.error?.message || "");
        if (message.includes("updated_at")) {
          const withoutUpdated = await supabase
            .from("post_tags")
            .select(`
              post:posts (
                id,
                titulo,
                slug,
                body,
                imagen_url,
                fecha
              )
            `)
            .eq("tag_id", tag.id)
            .order("created_at", { ascending: false });
          postTags = withoutUpdated.data ?? [];
        } else {
          postTags = [];
        }
      } else {
        postTags = withUpdated.data ?? [];
      }

      const posts = (postTags ?? [])
        .map((item: { post?: unknown }) => item.post)
        .filter(Boolean);

      const response = successResponse({ tag, posts });
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

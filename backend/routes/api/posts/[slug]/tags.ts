import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../../middleware/cors.ts";
import { supabase } from "../../../../lib/supabase.ts";
import { errorResponse, successResponse } from "../../../../utils/responses.ts";

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
        const response = errorResponse("Post slug is required", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const { data: post, error: postError } = await supabase
        .from("posts")
        .select("id, slug")
        .eq("slug", slug)
        .maybeSingle();

      if (postError) {
        const response = errorResponse("Failed to fetch post", 500);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      if (!post) {
        const response = errorResponse("Post not found", 404);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const { data: postTags, error: tagsError } = await supabase
        .from("post_tags")
        .select(`
          tag:tags (
            id,
            name,
            slug,
            description,
            usage_count
          )
        `)
        .eq("post_id", post.id);

      if (tagsError) {
        const response = successResponse({ tags: [] }, "No tags available");
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const tags = (postTags ?? [])
        .map((item: { tag?: unknown }) => item.tag)
        .filter(Boolean);

      const response = successResponse({ tags });
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      const response = errorResponse(
        error instanceof Error ? error.message : "Failed to fetch post tags",
        500,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },
};

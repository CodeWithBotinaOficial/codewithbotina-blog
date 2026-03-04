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

  async GET(req) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);

    try {
      const url = new URL(req.url);
      const query = url.searchParams.get("q")?.trim() ?? "";

      if (query.length < 2) {
        const response = successResponse({ tags: [] });
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const { data: tags, error } = await supabase
        .from("tags")
        .select("id, name, slug, usage_count")
        .ilike("name", `%${query}%`)
        .order("usage_count", { ascending: false })
        .limit(10);

      if (error) {
        const response = errorResponse("Failed to fetch tags", 500);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const response = successResponse({ tags: tags ?? [] });
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      const response = errorResponse(
        error instanceof Error ? error.message : "Failed to autocomplete tags",
        500,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },
};

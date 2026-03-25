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
      const { data: tags, error } = await supabase
        .from("tags")
        // Some environments do not have tags.updated_at; only select stable columns.
        .select("id, name, slug, description, created_at, usage_count")
        .order("usage_count", { ascending: false });

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
        error instanceof Error ? error.message : "Failed to fetch tags",
        500,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },
};

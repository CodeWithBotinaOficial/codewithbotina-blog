import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { supabase } from "../../../lib/supabase.ts";
import { requireAdmin } from "../../../middleware/auth.ts";
import { errorResponse, successResponse } from "../../../utils/responses.ts";

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  },

  async POST(req) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);

    try {
      await requireAdmin(req);

      const payload = await req.json();
      const name = typeof payload?.name === "string" ? payload.name.trim() : "";
      const description = typeof payload?.description === "string" ? payload.description.trim() : null;

      if (!name || name.length < 2 || name.length > 50) {
        const response = errorResponse("Tag name must be 2-50 characters", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const slug = slugify(name);
      if (!slug) {
        const response = errorResponse("Unable to generate tag slug", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const { data: tag, error } = await supabase
        .from("tags")
        .insert({ name, slug, description: description || null })
        .select("id, name, slug, usage_count, description")
        .single();

      if (error) {
        const isDuplicate = error.code === "23505";
        const response = errorResponse(
          isDuplicate ? "Tag already exists" : "Failed to create tag",
          isDuplicate ? 409 : 500,
        );
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const response = successResponse({ tag }, "Tag created", 201);
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      const response = errorResponse(
        error instanceof Error ? error.message : "Failed to create tag",
        500,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },
};

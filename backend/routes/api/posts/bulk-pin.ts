import { Handlers } from "$fresh/server.ts";
import { supabase } from "../../../lib/supabase.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { requireAdmin } from "../../../middleware/auth.ts";
import { AppError, ValidationError } from "../../../utils/errors.ts";
import { errorResponse, successResponse } from "../../../utils/responses.ts";

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  },

  async POST(req) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);

    try {
      await requireAdmin(req);

      let body: unknown;
      try {
        body = await req.json();
      } catch (_e) {
        throw new ValidationError("Invalid JSON body");
      }

      const post_ids = (body as { post_ids?: unknown }).post_ids;
      const is_pinned = (body as { is_pinned?: unknown }).is_pinned;

      if (!Array.isArray(post_ids) || post_ids.length < 1) {
        throw new ValidationError("post_ids array required");
      }
      if (typeof is_pinned !== "boolean") {
        throw new ValidationError("is_pinned boolean required");
      }

      const ids = post_ids
        .map((v) => String(v ?? "").trim())
        .filter(Boolean);
      if (ids.length < 1) throw new ValidationError("post_ids array required");

      const { data, error } = await supabase
        .from("posts")
        .update({ is_pinned })
        .in("id", ids)
        .select("id, slug, language, is_pinned");

      if (error) {
        console.error("Supabase error:", error);
        throw new AppError("Failed to bulk update pin status", 500);
      }

      const updated = Array.isArray(data) ? data : [];
      const response = successResponse(
        { updated_count: updated.length, posts: updated },
        "Pin statuses updated",
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

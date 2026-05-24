import { Handlers } from "$fresh/server.ts";
import { supabase } from "../../../lib/supabase.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { AppError } from "../../../utils/errors.ts";
import { errorResponse, successResponse } from "../../../utils/responses.ts";

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  },

  async GET(req) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const url = new URL(req.url);
    const language = url.searchParams.get("language") ?? undefined;
    const status = url.searchParams.get("status") ?? undefined;
    const limit = Math.min(Number(url.searchParams.get("limit") ?? "20"), 50);

    try {
      let query = supabase.from("polls").select("*").order("created_at", {
        ascending: false,
      });
      if (language) query = query.eq("language", language);
      if (status) query = query.eq("status", status);
      const { data, error } = await query.range(0, Math.max(limit - 1, 0));
      if (error) throw error;

      const response = successResponse(data ?? [], "Polls fetched", 200);
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

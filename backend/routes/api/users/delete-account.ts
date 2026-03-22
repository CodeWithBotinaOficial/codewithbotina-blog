import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { requireAuth } from "../../../middleware/auth.ts";
import { supabase } from "../../../lib/supabase.ts";
import { clearAuthCookies } from "../../../utils/auth.cookies.ts";
import { AppError } from "../../../utils/errors.ts";
import { errorResponse, successResponse } from "../../../utils/responses.ts";

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  },

  async POST(req) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    headers.set("Cache-Control", "no-store");
    headers.set("Vary", "Origin, Cookie");

    try {
      const user = await requireAuth(req);

      // Transactional deletion is implemented in the database via a SECURITY DEFINER function.
      const { error } = await supabase.rpc("delete_user_account", {
        target_user_id: user.id,
      });

      if (error) {
        console.error("Supabase RPC error:", error);
        const missingFn = String(error.message ?? "").toLowerCase().includes(
          "function delete_user_account",
        );
        throw new AppError(
          missingFn
            ? "Account deletion is not configured on the database (missing delete_user_account function)"
            : "Failed to delete account",
          500,
        );
      }

      clearAuthCookies(headers, req);

      const response = successResponse(
        { deleted: true },
        "Account deleted successfully",
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


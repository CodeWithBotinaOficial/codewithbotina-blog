import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { supabase } from "../../../lib/supabase.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { AppError } from "../../../utils/errors.ts";
import { errorResponse } from "../../../utils/responses.ts";

const authService = new AuthService();

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
    const logs: string[] = [];

    try {
      logs.push("Test endpoint reached");

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const hasServiceKey = Boolean(Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
      logs.push(`SUPABASE_URL: ${supabaseUrl ? "present" : "missing"}`);
      logs.push(`SERVICE_ROLE_KEY: ${hasServiceKey ? "present" : "missing"}`);

      const { error: postError } = await supabase
        .from("posts")
        .select("id")
        .limit(1);

      if (postError) {
        logs.push(`Posts table error: ${postError.message}`);
      } else {
        logs.push("Posts table accessible");
      }

      const { error: adminError } = await supabase
        .from("admin_users")
        .select("user_id")
        .limit(1);

      if (adminError) {
        logs.push(`Admin table error: ${adminError.message}`);
      } else {
        logs.push("Admin table accessible");
      }

      const authHeader = req.headers.get("Authorization");
      logs.push(`Auth header present: ${Boolean(authHeader)}`);

      if (authHeader) {
        const token = authHeader.replace("Bearer ", "");
        try {
          const user = await authService.getUserFromToken(token);
          logs.push(`Authenticated user: ${user.email ?? user.id}`);
          logs.push(`Is admin: ${Boolean(user.is_admin)}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : "Unknown error";
          logs.push(`Auth error: ${message}`);
        }
      }

      const response = new Response(
        JSON.stringify({
          success: true,
          logs,
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Internal server error";
      logs.push(`Unexpected error: ${message}`);
      const response = errorResponse(message, error instanceof AppError ? error.statusCode : 500);
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },
};

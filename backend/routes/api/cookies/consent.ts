import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { supabase } from "../../../lib/supabase.ts";
import { errorResponse, successResponse } from "../../../utils/responses.ts";
import { optionalAuth } from "../../../middleware/auth.ts";

function getClientIp(req: Request): string | null {
  return req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for") ||
    null;
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
      const user = await optionalAuth(req);
      const payload = await req.json();

      const analytics = Boolean(payload?.analytics_cookies);
      const marketing = Boolean(payload?.marketing_cookies);
      const functional = payload?.functional_cookies === false ? false : true;
      const sessionId = typeof payload?.session_id === "string" ? payload.session_id.trim() : "";

      if (!user && !sessionId) {
        const response = errorResponse("Missing session_id", 400);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const record = {
        user_id: user?.id ?? null,
        session_id: user ? null : sessionId,
        analytics_cookies: analytics,
        marketing_cookies: marketing,
        functional_cookies: functional,
        consent_date: new Date().toISOString(),
        ip_address: getClientIp(req),
        user_agent: req.headers.get("user-agent"),
      };

      const conflictColumn = user ? "user_id" : "session_id";

      const { error } = await supabase
        .from("cookie_consent")
        .upsert(record, { onConflict: conflictColumn });

      if (error) {
        const response = errorResponse("Failed to store consent", 500);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const response = successResponse({ saved: true });
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      const response = errorResponse(
        error instanceof Error ? error.message : "Failed to store consent",
        500,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },
};

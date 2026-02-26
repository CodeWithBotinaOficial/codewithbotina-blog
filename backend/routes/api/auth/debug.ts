import { Handlers } from "$fresh/server.ts";
import { getCookies } from "$std/http/cookie.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { AuthService } from "../../../services/auth.service.ts";
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

    const authHeader = req.headers.get("Authorization");
    const cookies = getCookies(req.headers);
    const accessToken = cookies["cwb_access"] ?? null;
    const pkceToken = cookies["cwb_pkce"] ?? null;

    let user = null;
    let error = null;

    try {
      const token = authHeader?.startsWith("Bearer ")
        ? authHeader.slice(7)
        : accessToken;
      if (token) {
        user = await authService.getUserFromToken(token);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : "Unknown error";
    }

    const body = {
      hasAuthHeader: Boolean(authHeader),
      hasCookies: Object.keys(cookies).length > 0,
      hasAccessCookie: Boolean(accessToken),
      hasPkceCookie: Boolean(pkceToken),
      user,
      error,
    };

    headers.set("Content-Type", "application/json");
    return new Response(JSON.stringify(body), {
      status: 200,
      headers,
    });
  },
};

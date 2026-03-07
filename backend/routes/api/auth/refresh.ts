import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { getRefreshToken } from "../../../middleware/auth.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { clearAuthCookies, setAuthCookies } from "../../../utils/auth.cookies.ts";
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

  async POST(req) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);

    let body: { refresh_token?: string } | null = null;
    try {
      body = await req.json();
    } catch (_error) {
      // Ignore JSON parse errors and fallback to cookie
    }

    const refreshToken = body?.refresh_token || getRefreshToken(req);

    if (!refreshToken) {
      const response = errorResponse("Missing refresh token", 401);
      headers.forEach((value, key) => {
        response.headers.set(key, value);
      });
      return response;
    }

    try {
      const session = await authService.refreshAccessToken(refreshToken);
      setAuthCookies(headers, req, session);

      const body = {
        success: true,
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
      };

      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify(body), {
        status: 200,
        headers,
      });
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("refresh token")
      ) {
        // Clear stale cookies to avoid repeated refresh failures.
        clearAuthCookies(headers, req);
      }
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      const response = errorResponse(
        error instanceof Error ? error.message : "Internal server error",
        statusCode,
      );
      headers.forEach((value, key) => {
        response.headers.set(key, value);
      });
      return response;
    }
  },
};

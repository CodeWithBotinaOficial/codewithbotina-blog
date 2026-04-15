import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { getRefreshToken, requireAuth } from "../../../middleware/auth.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { AuthenticatedUser } from "../../../types/auth.types.ts";
import {
  clearAuthCookies,
  setAuthCookies,
} from "../../../utils/auth.cookies.ts";
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
    headers.set("Cache-Control", "no-store");
    headers.set("Vary", "Origin, Cookie");

    try {
      let user: AuthenticatedUser;

      try {
        user = await requireAuth(req);
      } catch (error) {
        const refreshToken = getRefreshToken(req);
        const shouldAttemptRefresh = error instanceof AppError &&
          error.statusCode === 401 &&
          Boolean(refreshToken);

        if (!shouldAttemptRefresh || !refreshToken) {
          throw error;
        }

        try {
          const session = await authService.refreshAccessToken(refreshToken);
          setAuthCookies(headers, req, session);
          user = await authService.getUserFromToken(session.access_token);
        } catch (refreshError) {
          clearAuthCookies(headers, req);
          throw refreshError;
        }
      }

      const body = {
        success: true,
        user,
      };

      headers.set("Content-Type", "application/json");
      return new Response(JSON.stringify(body), {
        status: 200,
        headers,
      });
    } catch (error) {
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

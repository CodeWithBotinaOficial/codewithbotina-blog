import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { getAccessToken } from "../../../middleware/auth.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { clearAuthCookies } from "../../../utils/auth.cookies.ts";
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

    const token = getAccessToken(req);
    if (!token) {
      const response = errorResponse("Unauthorized", 401);
      headers.forEach((value, key) => {
        response.headers.set(key, value);
      });
      return response;
    }

    try {
      await authService.signOut(token);
      clearAuthCookies(headers, req);

      const body = {
        success: true,
        message: "Signed out successfully",
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

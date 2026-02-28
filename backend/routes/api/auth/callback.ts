import { Handlers } from "$fresh/server.ts";
import { getCookies } from "$std/http/cookie.ts";
import { AuthService } from "../../../services/auth.service.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import {
  clearPkceCookie,
  PKCE_COOKIE_NAME,
  setAuthCookies,
} from "../../../utils/auth.cookies.ts";
import { AppError } from "../../../utils/errors.ts";
import { errorResponse } from "../../../utils/responses.ts";
import { getEnvironmentConfig } from "../../../lib/env.ts";
import { takePkceSession } from "../../../lib/pkce.store.ts";

function isValidNext(next: string, frontendUrl: string): boolean {
  if (!next) return false;
  try {
    const nextUrl = new URL(next);
    const frontend = new URL(frontendUrl);
    return nextUrl.origin === frontend.origin;
  } catch (_error) {
    return false;
  }
}

export const handler: Handlers = {
  async GET(req) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const next = url.searchParams.get("next") ?? "";
    const pkceId = url.searchParams.get("pkce_id") ?? "";

    if (!code) {
      const response = errorResponse("Missing authorization code", 400);
      headers.forEach((value, key) => {
        response.headers.set(key, value);
      });
      return response;
    }

    try {
      const cookies = getCookies(req.headers);
      const storedVerifier = pkceId ? takePkceSession(pkceId) : null;
      const codeVerifier = storedVerifier ?? cookies[PKCE_COOKIE_NAME] ?? null;
      if (!codeVerifier) {
        const response = errorResponse("Missing PKCE code verifier", 400);
        headers.forEach((value, key) => {
          response.headers.set(key, value);
        });
        return response;
      }

      console.log("OAuth callback:", {
        hasCode: Boolean(code),
        hasPkce: Boolean(codeVerifier),
        origin,
        next,
      });
      const authService = new AuthService();
      const { session, userId } = await authService.exchangeCodeForSessionWithVerifier(
        code,
        codeVerifier,
      );
      console.log("OAuth session created:", {
        userId,
        expiresIn: session.expires_in,
      });
      setAuthCookies(headers, req, session);
      clearPkceCookie(headers, req);

      const { frontendUrl } = getEnvironmentConfig();
      const callbackPath = Deno.env.get("FRONTEND_AUTH_CALLBACK") ||
        "/auth/success";
      const redirectUrl = new URL(callbackPath, frontendUrl);
      if (isValidNext(next, frontendUrl)) {
        redirectUrl.searchParams.set("next", next);
      }

      headers.set("Location", redirectUrl.toString());
      return new Response(null, {
        status: 302,
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

import { Handlers } from "$fresh/server.ts";
import { createClient } from "@supabase/supabase-js";
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

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ||
  "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ||
  "placeholder-anon-key";

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

    if (!code) {
      const response = errorResponse("Missing authorization code", 400);
      headers.forEach((value, key) => {
        response.headers.set(key, value);
      });
      return response;
    }

    try {
      const cookies = getCookies(req.headers);
      const codeVerifier = cookies[PKCE_COOKIE_NAME] ?? null;
      const storage = {
        getItem: (key: string) =>
          key.endsWith("-code-verifier") ? codeVerifier : null,
        setItem: (_key: string, _value: string) => {},
        removeItem: (_key: string) => {},
      };
      const client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          flowType: "pkce",
          storage,
        },
      });
      const authService = new AuthService(client);

      const { session } = await authService.exchangeCodeForSession(code);
      setAuthCookies(headers, req, session);
      clearPkceCookie(headers, req);

      const frontendUrl = Deno.env.get("FRONTEND_URL") ||
        "https://blog.codewithbotina.com";
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

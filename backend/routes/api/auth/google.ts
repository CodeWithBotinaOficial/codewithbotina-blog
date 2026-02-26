import { Handlers } from "$fresh/server.ts";
import { createClient } from "@supabase/supabase-js";
import { AuthService } from "../../../services/auth.service.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { isAuthRateLimited } from "../../../middleware/rateLimit.ts";
import { errorResponse } from "../../../utils/responses.ts";
import { AppError } from "../../../utils/errors.ts";
import { setPkceCookie } from "../../../utils/auth.cookies.ts";
import { getEnvironmentConfig } from "../../../lib/env.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ||
  "https://placeholder.supabase.co";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ||
  "placeholder-anon-key";

function createPkceAuthService(
  onVerifier: (value: string) => void,
): AuthService {
  const storage = {
    getItem: (_key: string) => null,
    setItem: (key: string, value: string) => {
      if (key.endsWith("-code-verifier")) {
        onVerifier(value);
      }
    },
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

  return new AuthService(client);
}

function getClientIp(ctx: { remoteAddr: Deno.Addr }): string {
  if (ctx.remoteAddr.transport === "tcp" || ctx.remoteAddr.transport === "udp") {
    return (ctx.remoteAddr as Deno.NetAddr).hostname;
  }
  return "unknown";
}

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
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  },

  async GET(req, ctx) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);

    if (isAuthRateLimited(getClientIp(ctx))) {
      const response = errorResponse("Too many requests", 429);
      headers.forEach((value, key) => {
        response.headers.set(key, value);
      });
      return response;
    }

    const url = new URL(req.url);
    const next = url.searchParams.get("next") ?? "";
    const { frontendUrl } = getEnvironmentConfig();
    const redirectUrl = new URL("/api/auth/callback", req.url);
    if (isValidNext(next, frontendUrl)) {
      redirectUrl.searchParams.set("next", next);
    }
    const redirectTo = redirectUrl.toString();

    try {
      let codeVerifier: string | null = null;
      const authService = createPkceAuthService((value) => {
        codeVerifier = value;
      });
      const url = await authService.getGoogleAuthUrl(redirectTo);
      if (codeVerifier) {
        setPkceCookie(headers, req, codeVerifier);
      }
      headers.set("Location", url);
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

import { Handlers } from "$fresh/server.ts";
import { encodeBase64Url } from "$std/encoding/base64url.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { isAuthRateLimited } from "../../../middleware/rateLimit.ts";
import { errorResponse } from "../../../utils/responses.ts";
import { AppError } from "../../../utils/errors.ts";
import { setPkceCookie } from "../../../utils/auth.cookies.ts";
import { getEnvironmentConfig } from "../../../lib/env.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ||
  "https://placeholder.supabase.co";
const SUPPORTED_LANGUAGES = new Set(["en", "es"]);

async function generatePkcePair() {
  const verifierBytes = crypto.getRandomValues(new Uint8Array(32));
  const verifier = encodeBase64Url(verifierBytes);
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(verifier),
  );
  const challenge = encodeBase64Url(new Uint8Array(digest));
  return { verifier, challenge };
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
    const nextUrl = new URL(next, frontendUrl);
    const frontend = new URL(frontendUrl);
    return nextUrl.origin === frontend.origin;
  } catch (_error) {
    return false;
  }
}

function extractLanguageFromNext(
  next: string,
  frontendUrl: string,
): string | null {
  if (!next) return null;
  try {
    const nextUrl = new URL(next, frontendUrl);
    const match = nextUrl.pathname.match(/^\/(en|es)(\/|$)/);
    if (match && SUPPORTED_LANGUAGES.has(match[1])) {
      return match[1];
    }
  } catch (_error) {
    return null;
  }
  return null;
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
    const validNext = isValidNext(next, frontendUrl);
    const nextLanguage = validNext
      ? extractLanguageFromNext(next, frontendUrl)
      : null;

    try {
      const apiOrigin = new URL(req.url).origin;
      const backendCallback = new URL("/api/auth/callback", apiOrigin);

      const { verifier, challenge } = await generatePkcePair();
      setPkceCookie(headers, req, verifier);

      const redirectTo = backendCallback.toString();

      console.log("OAuth start:", {
        origin,
        next: validNext ? next : "",
        redirectTo,
        hasNextLanguage: Boolean(nextLanguage),
      });

      const authUrl = new URL("/auth/v1/authorize", SUPABASE_URL);
      authUrl.searchParams.set("provider", "google");
      authUrl.searchParams.set("redirect_to", redirectTo);
      const stateParts: string[] = [];
      if (nextLanguage) {
        stateParts.push(`lang:${nextLanguage}`);
      }
      if (validNext) {
        stateParts.push(`next:${encodeURIComponent(next)}`);
      }
      if (stateParts.length > 0) {
        authUrl.searchParams.set("state", stateParts.join(";"));
      }
      authUrl.searchParams.set("code_challenge", challenge);
      authUrl.searchParams.set("code_challenge_method", "S256");
      authUrl.searchParams.set("scopes", "openid email profile");
      authUrl.searchParams.set("prompt", "select_account");
      authUrl.searchParams.set("access_type", "offline");

      headers.set("Location", authUrl.toString());
      console.log("OAuth redirecting to Supabase:", {
        supabaseAuthorize: authUrl.toString(),
      });
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

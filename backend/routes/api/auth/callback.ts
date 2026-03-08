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

const SUPPORTED_LANGUAGES = new Set(["en", "es"]);
const TOKEN_PREVIEW = 8;

function maskToken(token?: string | null): string | null {
  if (!token) return null;
  if (token.length <= TOKEN_PREVIEW * 2) return `${token.slice(0, TOKEN_PREVIEW)}...`;
  return `${token.slice(0, TOKEN_PREVIEW)}...${token.slice(-TOKEN_PREVIEW)}`;
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

function extractLanguageFromState(state: string): string | null {
  if (!state) return null;
  const match = state.match(/(?:^|[;&])lang[:=]([a-z]{2})/i);
  if (!match) return null;
  const language = match[1].toLowerCase();
  return SUPPORTED_LANGUAGES.has(language) ? language : null;
}

function extractNextFromState(state: string): string | null {
  if (!state) return null;
  const match = state.match(/(?:^|[;&])next[:=]([^;&]+)/i);
  if (!match) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch (_error) {
    return match[1];
  }
}

function resolveCallbackPath(
  frontendUrl: string,
  next: string,
  state: string,
): string {
  const envCallback = Deno.env.get("FRONTEND_AUTH_CALLBACK") || "/auth/success";
  const nextLanguage = extractLanguageFromNext(next, frontendUrl);
  const stateLanguage = extractLanguageFromState(state);
  const language = nextLanguage ?? stateLanguage;

  if (envCallback.includes("{lang}")) {
    return envCallback.replace("{lang}", language ?? "en");
  }

  if (language) {
    return `/${language}/auth/success`;
  }

  return envCallback;
}

export const handler: Handlers = {
  async GET(req) {
    console.log("🔥 CALLBACK HIT - Request received:", {
      url: req.url,
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
    });
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const queryNext = url.searchParams.get("next") ?? "";
    const state = url.searchParams.get("state") ?? "";
    const pkceId = url.searchParams.get("pkce_id") ?? "";
    const next = queryNext || extractNextFromState(state) || "";

    console.log("OAuth callback received:", {
      origin,
      hasCode: Boolean(code),
      hasPkceId: Boolean(pkceId),
      hasState: Boolean(state),
      next: next ? "present" : "empty",
    });

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
      console.log("OAuth callback PKCE check:", {
        pkceId,
        storedVerifier: Boolean(storedVerifier),
        cookieVerifier: Boolean(cookies[PKCE_COOKIE_NAME]),
        hasVerifier: Boolean(codeVerifier),
      });
      if (!codeVerifier) {
        const response = errorResponse("Missing PKCE code verifier", 400);
        headers.forEach((value, key) => {
          response.headers.set(key, value);
        });
        return response;
      }

      const authService = new AuthService();
      const { session, userId } = await authService.exchangeCodeForSessionWithVerifier(
        code,
        codeVerifier,
      );
      console.log("OAuth session created:", {
        userId,
        expiresIn: session.expires_in,
        accessToken: maskToken(session.access_token),
        refreshToken: maskToken(session.refresh_token),
      });
      setAuthCookies(headers, req, session);
      clearPkceCookie(headers, req);

      const { frontendUrl } = getEnvironmentConfig();
      const callbackPath = resolveCallbackPath(frontendUrl, next, state);
      const redirectUrl = new URL(callbackPath, frontendUrl);
      const tokenParams = new URLSearchParams({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: String(session.expires_in ?? ""),
      });
      redirectUrl.hash = tokenParams.toString();
      if (isValidNext(next, frontendUrl)) {
        redirectUrl.searchParams.set("next", next);
      }

      headers.set("Location", redirectUrl.toString());
      console.log("OAuth callback redirecting:", {
        redirect: redirectUrl.toString(),
        setCookies: headers.get("set-cookie") ? "present" : "missing",
      });
      return new Response(null, {
        status: 302,
        headers,
      });
    } catch (error) {
      console.error("OAuth callback failed:", error);
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

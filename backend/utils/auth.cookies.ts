import { deleteCookie, setCookie } from "$std/http/cookie.ts";
import { AuthSession } from "../types/auth.types.ts";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "../middleware/auth.ts";

const ACCESS_COOKIE_MAX_AGE_SECONDS = 60 * 60;
const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;
export const PKCE_COOKIE_NAME = "cwb_pkce";
export const AUTH_STATE_COOKIE_NAME = "cwb_auth_state";
export const SESSION_CREATED_COOKIE_NAME = "cwb_session_created";

function expiresAt(maxAge: number): Date {
  return new Date(Date.now() + (maxAge * 1000));
}

function isSecureRequest(req: Request): boolean {
  const protocol = new URL(req.url).protocol;
  if (protocol === "https:") return true;

  const forwarded = req.headers.get("x-forwarded-proto") ||
    req.headers.get("x-forwarded-protocol");
  if (forwarded) {
    const value = forwarded.split(",")[0]?.trim().toLowerCase();
    if (value === "https") return true;
  }

  const cfVisitor = req.headers.get("cf-visitor");
  if (cfVisitor) {
    try {
      const parsed = JSON.parse(cfVisitor) as { scheme?: string };
      if (parsed?.scheme?.toLowerCase() === "https") return true;
    } catch (_error) {
      // Ignore malformed cf-visitor header
    }
  }

  return false;
}

function getCookieDomain(req: Request): string | undefined {
  const hostname = new URL(req.url).hostname;
  if (hostname.endsWith("codewithbotina.com")) {
    return ".codewithbotina.com";
  }
  return undefined;
}

export function setAuthCookies(
  headers: Headers,
  req: Request,
  session: AuthSession,
  opts?: { setCreated?: boolean },
): void {
  const secure = isSecureRequest(req);
  const sameSite = "Lax";
  const domain = getCookieDomain(req);
  const accessMaxAge = Math.max(
    Math.min(
      session.expires_in ?? ACCESS_COOKIE_MAX_AGE_SECONDS,
      ACCESS_COOKIE_MAX_AGE_SECONDS,
    ),
    60,
  );

  setCookie(headers, {
    name: ACCESS_COOKIE_NAME,
    value: session.access_token,
    httpOnly: true,
    sameSite,
    secure,
    domain,
    path: "/",
    maxAge: accessMaxAge,
    expires: expiresAt(accessMaxAge),
  });

  setCookie(headers, {
    name: REFRESH_COOKIE_NAME,
    value: session.refresh_token,
    httpOnly: true,
    sameSite,
    secure,
    domain,
    path: "/",
    maxAge: SEVEN_DAYS_SECONDS,
    expires: expiresAt(SEVEN_DAYS_SECONDS),
  });

  // Track session creation time so we can enforce a 7-day absolute expiry server-side
  if (opts?.setCreated ?? true) {
    // Track session creation time so we can enforce a 7-day absolute expiry server-side
    setCookie(headers, {
      name: SESSION_CREATED_COOKIE_NAME,
      value: new Date().toISOString(),
      httpOnly: true,
      sameSite,
      secure,
      domain,
      path: "/",
      maxAge: SEVEN_DAYS_SECONDS,
      expires: expiresAt(SEVEN_DAYS_SECONDS),
    });
  }

  setCookie(headers, {
    name: AUTH_STATE_COOKIE_NAME,
    value: "1",
    httpOnly: false,
    sameSite,
    secure,
    domain,
    path: "/",
    maxAge: SEVEN_DAYS_SECONDS,
    expires: expiresAt(SEVEN_DAYS_SECONDS),
  });
}

export function clearAuthCookies(headers: Headers, req: Request): void {
  const domain = getCookieDomain(req);
  deleteCookie(headers, ACCESS_COOKIE_NAME, {
    domain,
    path: "/",
  });

  deleteCookie(headers, REFRESH_COOKIE_NAME, {
    domain,
    path: "/",
  });

  deleteCookie(headers, AUTH_STATE_COOKIE_NAME, {
    domain,
    path: "/",
  });

  deleteCookie(headers, SESSION_CREATED_COOKIE_NAME, {
    domain,
    path: "/",
  });
}

export function setPkceCookie(
  headers: Headers,
  req: Request,
  codeVerifier: string,
): void {
  const secure = isSecureRequest(req);
  const domain = getCookieDomain(req);

  setCookie(headers, {
    name: PKCE_COOKIE_NAME,
    value: codeVerifier,
    httpOnly: true,
    sameSite: "Lax",
    secure,
    domain,
    path: "/",
    maxAge: 10 * 60,
    expires: expiresAt(10 * 60),
  });
}

export function clearPkceCookie(headers: Headers, req: Request): void {
  const domain = getCookieDomain(req);
  deleteCookie(headers, PKCE_COOKIE_NAME, {
    domain,
    path: "/",
  });
}

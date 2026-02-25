import { deleteCookie, setCookie } from "$std/http/cookie.ts";
import { AuthSession } from "../types/auth.types.ts";
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from "../middleware/auth.ts";

const SEVEN_DAYS_SECONDS = 60 * 60 * 24 * 7;
export const PKCE_COOKIE_NAME = "cwb_pkce";

function isSecureRequest(req: Request): boolean {
  return new URL(req.url).protocol === "https:";
}

export function setAuthCookies(
  headers: Headers,
  req: Request,
  session: AuthSession,
): void {
  const secure = isSecureRequest(req);
  const maxAge = Math.max(session.expires_in ?? SEVEN_DAYS_SECONDS, 60);

  setCookie(headers, {
    name: ACCESS_COOKIE_NAME,
    value: session.access_token,
    httpOnly: true,
    sameSite: "Lax",
    secure,
    path: "/",
    maxAge,
  });

  setCookie(headers, {
    name: REFRESH_COOKIE_NAME,
    value: session.refresh_token,
    httpOnly: true,
    sameSite: "Lax",
    secure,
    path: "/",
    maxAge: SEVEN_DAYS_SECONDS,
  });
}

export function clearAuthCookies(headers: Headers, req: Request): void {
  deleteCookie(headers, ACCESS_COOKIE_NAME, {
    path: "/",
  });

  deleteCookie(headers, REFRESH_COOKIE_NAME, {
    path: "/",
  });
}

export function setPkceCookie(
  headers: Headers,
  req: Request,
  codeVerifier: string,
): void {
  const secure = isSecureRequest(req);

  setCookie(headers, {
    name: PKCE_COOKIE_NAME,
    value: codeVerifier,
    httpOnly: true,
    sameSite: "Lax",
    secure,
    path: "/",
    maxAge: 10 * 60,
  });
}

export function clearPkceCookie(headers: Headers, req: Request): void {
  deleteCookie(headers, PKCE_COOKIE_NAME, {
    path: "/",
  });
}

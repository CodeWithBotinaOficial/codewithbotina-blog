import { getCookies } from "$std/http/cookie.ts";
import { AuthService } from "../services/auth.service.ts";
import { AuthenticatedUser } from "../types/auth.types.ts";
import { AppError } from "../utils/errors.ts";

export const ACCESS_COOKIE_NAME = "cwb_access";
export const REFRESH_COOKIE_NAME = "cwb_refresh";

const authService = new AuthService();

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return null;

  const [type, token] = authHeader.split(" ");
  if (type !== "Bearer" || !token) return null;

  return token;
}

function getCookieToken(req: Request, name: string): string | null {
  const cookies = getCookies(req.headers);
  return cookies[name] ?? null;
}

export function getAccessToken(req: Request): string | null {
  return getBearerToken(req) || getCookieToken(req, ACCESS_COOKIE_NAME);
}

export function getRefreshToken(req: Request): string | null {
  return getCookieToken(req, REFRESH_COOKIE_NAME);
}

export async function requireAuth(req: Request): Promise<AuthenticatedUser> {
  const token = getAccessToken(req);
  if (!token) {
    throw new AppError("Unauthorized", 401);
  }

  return await authService.getUserFromToken(token);
}

export async function optionalAuth(
  req: Request,
): Promise<AuthenticatedUser | null> {
  const token = getAccessToken(req);
  if (!token) return null;

  try {
    return await authService.getUserFromToken(token);
  } catch (_error) {
    return null;
  }
}

export async function requireAdmin(req: Request): Promise<AuthenticatedUser> {
  const user = await requireAuth(req);
  if (!user.is_admin) {
    throw new AppError("Forbidden", 403);
  }
  return user;
}

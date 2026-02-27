import { getEnvironmentConfig } from "../lib/env.ts";

export const ALLOWED_ORIGIN = getEnvironmentConfig().allowedOrigin;

export function corsHeaders(origin: string | null): Headers {
  const headers = new Headers();

  // In development, we might want to allow localhost
  // For production, strictly check against ALLOWED_ORIGIN
  if (origin === ALLOWED_ORIGIN || (origin && origin.includes("localhost"))) {
    headers.set("Access-Control-Allow-Origin", origin);
  } else {
    headers.set("Access-Control-Allow-Origin", ALLOWED_ORIGIN);
  }

  headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Origin, Authorization");
  headers.set("Access-Control-Allow-Credentials", "true");

  return headers;
}

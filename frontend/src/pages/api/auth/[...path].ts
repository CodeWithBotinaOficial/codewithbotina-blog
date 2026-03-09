import type { APIRoute } from "astro";
import { proxyAuthRequest } from "../../../lib/auth-proxy";

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  return proxyAuthRequest(request, params.path ?? "");
};

export const POST: APIRoute = async ({ request, params }) => {
  return proxyAuthRequest(request, params.path ?? "");
};

export const OPTIONS: APIRoute = async ({ request, params }) => {
  return proxyAuthRequest(request, params.path ?? "");
};

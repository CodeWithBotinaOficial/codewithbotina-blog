import type { APIRoute } from "astro";
import { proxyAdminRequest } from "../../../lib/admin-proxy";

export const prerender = false;

export const GET: APIRoute = async ({ request, params }) => {
  return proxyAdminRequest(request, params.path ?? "");
};

export const POST: APIRoute = async ({ request, params }) => {
  return proxyAdminRequest(request, params.path ?? "");
};

export const PUT: APIRoute = async ({ request, params }) => {
  return proxyAdminRequest(request, params.path ?? "");
};

export const DELETE: APIRoute = async ({ request, params }) => {
  return proxyAdminRequest(request, params.path ?? "");
};

export const PATCH: APIRoute = async ({ request, params }) => {
  return proxyAdminRequest(request, params.path ?? "");
};

export const OPTIONS: APIRoute = async ({ request, params }) => {
  return proxyAdminRequest(request, params.path ?? "");
};


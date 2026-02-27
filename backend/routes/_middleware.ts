import { MiddlewareHandlerContext } from "$fresh/server.ts";
import { corsHeaders } from "../middleware/cors.ts";

export async function handler(
  req: Request,
  ctx: MiddlewareHandlerContext,
) {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  }

  const response = await ctx.next();
  const headers = corsHeaders(origin);
  headers.forEach((value, key) => response.headers.set(key, value));
  return response;
}

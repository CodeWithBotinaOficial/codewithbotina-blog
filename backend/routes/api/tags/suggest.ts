import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { supabase } from "../../../lib/supabase.ts";
import { errorResponse, successResponse } from "../../../utils/responses.ts";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  },

  async POST(req) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);

    try {
      const payload = await req.json();
      const title = typeof payload?.title === "string" ? payload.title : "";
      const body = typeof payload?.body === "string" ? payload.body : "";

      if (!title && !body) {
        const response = successResponse(
          { suggestions: [] },
          "No content provided",
        );
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const { data: tags, error } = await supabase
        .from("tags")
        .select("id, name, slug, usage_count")
        .order("usage_count", { ascending: false });

      if (error) {
        const response = errorResponse("Failed to fetch tags", 500);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const text = `${title} ${body}`.toLowerCase();
      const suggestions = (tags ?? [])
        .map((tag) => {
          const tagName = String(tag.name || "").toLowerCase();
          if (!tagName) return null;

          let score = 0;
          if (title.toLowerCase().includes(tagName)) score += 100;
          if (body.toLowerCase().includes(tagName)) score += 50;

          const wordBoundary = new RegExp(
            `\\b${escapeRegExp(tagName)}\\b`,
            "i",
          );
          if (wordBoundary.test(text)) score += 30;
          if (text.includes(tagName)) score += 10;

          const usage = typeof tag.usage_count === "number"
            ? tag.usage_count
            : 0;
          score += Math.log(usage + 1) * 2;

          return {
            id: tag.id,
            name: tag.name,
            slug: tag.slug,
            usage_count: usage,
            score,
          };
        })
        .filter((
          tag,
        ): tag is {
          id: string;
          name: string;
          slug: string;
          usage_count: number;
          score: number;
        } => Boolean(tag && tag.score > 0))
        .sort((a, b) => b.score - a.score)
        .slice(0, 10)
        .map(({ id, name, slug, usage_count }) => ({
          id,
          name,
          slug,
          usage_count,
        }));

      const response = successResponse({ suggestions });
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      const response = errorResponse(
        error instanceof Error
          ? error.message
          : "Failed to generate suggestions",
        500,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },
};

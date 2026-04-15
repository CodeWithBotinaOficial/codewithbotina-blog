import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { supabase } from "../../../lib/supabase.ts";
import { ValidationError } from "../../../utils/errors.ts";
import { errorResponse, successResponse } from "../../../utils/responses.ts";

const SUPPORTED_LANGUAGES = new Set(["en", "es", "fr", "de", "pt", "ja", "zh"]);
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const MAX_OFFSET = 50_000;
const MAX_QUERY_LENGTH = 80;

type Sort = "most_used" | "az" | "za" | "recent";

function parseEnum<T extends string>(
  raw: string | null,
  allowed: readonly T[],
  fallback: T,
): T {
  if (!raw) return fallback;
  const v = raw.trim() as T;
  return allowed.includes(v) ? v : fallback;
}

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, {
      status: 204,
      headers: corsHeaders(origin),
    });
  },

  async GET(req) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);

    try {
      const url = new URL(req.url);
      const q = (url.searchParams.get("q") ?? "").trim();
      const sort = parseEnum<Sort>(
        url.searchParams.get("sort"),
        ["most_used", "az", "za", "recent"],
        "most_used",
      );
      const limitParam = url.searchParams.get("limit");
      const offsetParam = url.searchParams.get("offset");
      const languageParam = (url.searchParams.get("language") ?? "").trim()
        .toLowerCase();
      const language = languageParam && languageParam !== "all"
        ? languageParam
        : "";

      if (q.length > MAX_QUERY_LENGTH) {
        throw new ValidationError("Query too long");
      }
      if (language && !SUPPORTED_LANGUAGES.has(language)) {
        throw new ValidationError("Unsupported language");
      }

      const limit = Math.min(
        Math.max(
          Number.parseInt(limitParam ?? `${DEFAULT_LIMIT}`, 10) ||
            DEFAULT_LIMIT,
          1,
        ),
        MAX_LIMIT,
      );
      const offset = Math.max(Number.parseInt(offsetParam ?? "0", 10) || 0, 0);
      if (offset > MAX_OFFSET) throw new ValidationError("Offset too large");

      // If filtering tags by language, compute usage counts from posts in that language.
      // This avoids relying on tags.usage_count (which is global).
      if (language) {
        const { data: posts, error: postsErr } = await supabase
          .from("posts")
          .select("id, post_tags(tag_id)")
          .eq("language", language);

        if (postsErr) {
          console.error("Supabase error:", postsErr);
          const response = errorResponse("Failed to fetch tags", 500);
          headers.forEach((value, key) => response.headers.set(key, value));
          return response;
        }

        const postsByTag = new Map<string, Set<string>>();
        type PostRow = {
          id: string;
          post_tags?: Array<{ tag_id: string } | null> | null;
        };
        for (const p of (posts ?? []) as unknown as PostRow[]) {
          const postId = p.id;
          const tagRows = Array.isArray(p.post_tags) ? p.post_tags : [];
          for (const tr of tagRows) {
            const tagId = tr?.tag_id;
            if (!postId || !tagId) continue;
            const set = postsByTag.get(tagId) ?? new Set<string>();
            set.add(postId);
            postsByTag.set(tagId, set);
          }
        }

        const tagIds = Array.from(postsByTag.keys());
        if (tagIds.length === 0) {
          const response = successResponse({
            tags: [],
            total: 0,
            limit,
            offset,
          });
          headers.forEach((value, key) => response.headers.set(key, value));
          return response;
        }

        let tagsQuery = supabase
          .from("tags")
          // Some environments do not have tags.updated_at; only select stable columns.
          .select("id, name, slug, description, created_at, usage_count")
          .in("id", tagIds);
        if (q) tagsQuery = tagsQuery.ilike("name", `%${q}%`);

        const { data: tags, error } = await tagsQuery;
        if (error) {
          console.error("Supabase error:", error);
          const response = errorResponse("Failed to fetch tags", 500);
          headers.forEach((value, key) => response.headers.set(key, value));
          return response;
        }

        type TagRow = {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          created_at: string | null;
          usage_count: number | null;
        };
        type EnrichedTagRow = TagRow & { usage_count_language: number };

        const enriched: EnrichedTagRow[] = ((tags ?? []) as unknown as TagRow[])
          .map((t) => ({
            ...t,
            usage_count_language: postsByTag.get(t.id)?.size ?? 0,
          }));

        enriched.sort((a, b) => {
          if (sort === "az") {
            return String(a.name).localeCompare(String(b.name));
          }
          if (sort === "za") {
            return String(b.name).localeCompare(String(a.name));
          }
          if (sort === "recent") {
            const at = a.created_at ? new Date(a.created_at).getTime() : 0;
            const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
            return bt - at;
          }
          return (b.usage_count_language ?? 0) - (a.usage_count_language ?? 0);
        });

        const total = enriched.length;
        const page = enriched.slice(offset, offset + limit);
        const response = successResponse({ tags: page, total, limit, offset });
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      // Default: tag list from tags table, with optional query + pagination.
      let query = supabase
        .from("tags")
        // Some environments do not have tags.updated_at; only select stable columns.
        .select("id, name, slug, description, created_at, usage_count", {
          count: "exact",
        });

      if (q) query = query.ilike("name", `%${q}%`);

      if (sort === "az" || sort === "za") {
        query = query.order("name", { ascending: sort === "az" });
      } else if (sort === "recent") {
        query = query.order("created_at", { ascending: false });
      } else {
        query = query.order("usage_count", { ascending: false });
      }

      const { data: tags, error, count } = await query.range(
        offset,
        offset + limit - 1,
      );

      if (error) {
        console.error("Supabase error:", error);
        const response = errorResponse("Failed to fetch tags", 500);
        headers.forEach((value, key) => response.headers.set(key, value));
        return response;
      }

      const response = successResponse({
        tags: tags ?? [],
        total: count ?? 0,
        limit,
        offset,
      });
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      const response = errorResponse(
        error instanceof Error ? error.message : "Failed to fetch tags",
        error instanceof ValidationError ? 400 : 500,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },
};

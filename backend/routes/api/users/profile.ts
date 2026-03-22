import { Handlers } from "$fresh/server.ts";
import { corsHeaders } from "../../../middleware/cors.ts";
import { requireAuth } from "../../../middleware/auth.ts";
import { supabase } from "../../../lib/supabase.ts";
import { AppError } from "../../../utils/errors.ts";
import { errorResponse, successResponse } from "../../../utils/responses.ts";

type PostSummary = {
  id: string;
  titulo: string;
  slug: string;
  language: string;
  imagen_url: string | null;
};

type LikedPostRow = {
  created_at: string | null;
  post: PostSummary | PostSummary[] | null;
};

type LikedPostItem = {
  liked_at: string | null;
  post: PostSummary;
};

export const handler: Handlers = {
  OPTIONS(req) {
    const origin = req.headers.get("Origin");
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  },

  async GET(req) {
    const origin = req.headers.get("Origin");
    const headers = corsHeaders(origin);
    headers.set("Cache-Control", "no-store");
    headers.set("Vary", "Origin, Cookie");

    try {
      const user = await requireAuth(req);
      const url = new URL(req.url);
      const rawLimit = Number(url.searchParams.get("limit") ?? "20");
      const rawOffset = Number(url.searchParams.get("offset") ?? "0");

      const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 200) : 20;
      const offset = Number.isFinite(rawOffset) ? Math.max(rawOffset, 0) : 0;

      const [
        likesCount,
        dislikesCount,
        commentsCount,
        likedTotal,
        likedPosts,
      ] = await Promise.all([
        supabase
          .from("post_reactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("reaction_type", "like"),
        supabase
          .from("post_reactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("reaction_type", "dislike"),
        supabase
          .from("comments")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("post_reactions")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("reaction_type", "like"),
        supabase
          .from("post_reactions")
          .select(
            "created_at, post:posts ( id, titulo, slug, language, imagen_url )",
          )
          .eq("user_id", user.id)
          .eq("reaction_type", "like")
          .order("created_at", { ascending: false })
          .range(offset, offset + limit - 1),
      ]);

      const firstError = likesCount.error || dislikesCount.error || commentsCount.error || likedTotal.error || likedPosts.error;
      if (firstError) {
        console.error("Supabase error:", firstError);
        throw new AppError("Failed to fetch profile data", 500);
      }

      const rows = (likedPosts.data ?? []) as unknown as LikedPostRow[];
      const liked_posts: LikedPostItem[] = rows
        .map((row) => {
          const post = Array.isArray(row.post) ? row.post[0] ?? null : row.post;
          return post ? ({ liked_at: row.created_at, post } as LikedPostItem) : null;
        })
        .filter((value): value is LikedPostItem => Boolean(value));

      const response = successResponse(
        {
          stats: {
            likes_given: likesCount.count ?? 0,
            dislikes_given: dislikesCount.count ?? 0,
            comments_posted: commentsCount.count ?? 0,
          },
          liked_posts_total: likedTotal.count ?? 0,
          liked_posts,
          pagination: { limit, offset },
        },
        "Profile fetched successfully",
        200,
      );

      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    } catch (error) {
      const statusCode = error instanceof AppError ? error.statusCode : 500;
      const response = errorResponse(
        error instanceof Error ? error.message : "Internal server error",
        statusCode,
      );
      headers.forEach((value, key) => response.headers.set(key, value));
      return response;
    }
  },
};

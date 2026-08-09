import { SupabaseClient } from "supabase";
import { supabase } from "../lib/supabase.ts";
import {
  Comment,
  CommentInsert,
  CommentUser,
  CommentWithLanguage,
} from "../types/comment.types.ts";
import { DatabaseError } from "../utils/errors.ts";

type CommentRowWithLanguage = {
  id?: unknown;
  post_id?: unknown;
  translation_group_id?: unknown;
  parent_id?: unknown;
  user_id?: unknown;
  content?: unknown;
  created_at?: unknown;
  updated_at?: unknown;
  is_pinned?: unknown;
  post_language?: unknown;
  post_slug?: unknown;
  post_title?: unknown;
};

type CommentTarget = {
  postId: string;
  translationGroupId: string | null;
  postIds: string[];
};

export class CommentRepository {
  private db: SupabaseClient;

  constructor(dbClient: SupabaseClient = supabase) {
    this.db = dbClient;
  }

  private normalizeComment(row: unknown): Comment {
    const r = (row ?? {}) as Record<string, unknown>;
    const userRaw = r.user;
    const user = Array.isArray(userRaw) ? userRaw[0] ?? null : userRaw ?? null;
    return {
      id: String(r.id ?? ""),
      post_id: String(r.post_id ?? ""),
      translation_group_id: typeof r.translation_group_id === "string"
        ? r.translation_group_id
        : null,
      parent_id: typeof r.parent_id === "string" ? r.parent_id : null,
      user_id: String(r.user_id ?? ""),
      content: String(r.content ?? ""),
      created_at: String(r.created_at ?? ""),
      updated_at: String(r.updated_at ?? ""),
      is_pinned: Boolean(r.is_pinned),
      user,
    };
  }

  private normalizeCommentWithLanguage(
    row: CommentRowWithLanguage,
    usersById: Map<string, CommentUser>,
  ): CommentWithLanguage {
    const userId = String(row.user_id ?? "");
    return {
      id: String(row.id ?? ""),
      post_id: String(row.post_id ?? ""),
      translation_group_id: typeof row.translation_group_id === "string"
        ? row.translation_group_id
        : null,
      parent_id: typeof row.parent_id === "string" ? row.parent_id : null,
      user_id: userId,
      content: String(row.content ?? ""),
      created_at: String(row.created_at ?? ""),
      updated_at: String(row.updated_at ?? ""),
      is_pinned: Boolean(row.is_pinned),
      post_language: String(row.post_language ?? ""),
      post_slug: String(row.post_slug ?? ""),
      post_title: String(row.post_title ?? ""),
      user: usersById.get(userId) ?? null,
      replies: [],
    };
  }

  private async resolveCommentTarget(postId: string): Promise<CommentTarget> {
    const { data: post, error: postError } = await this.db
      .from("posts")
      .select("id")
      .eq("id", postId)
      .single();

    if (postError || !post) {
      if ((postError as { code?: string } | null)?.code === "PGRST116") {
        throw new DatabaseError("Post not found");
      }
      console.error("Supabase error:", postError);
      throw new DatabaseError("Failed to verify post");
    }

    const { data: link, error: linkError } = await this.db
      .from("post_translations")
      .select("translation_group_id")
      .eq("post_id", postId)
      .maybeSingle();

    if (linkError) {
      console.error("Supabase error:", linkError);
      throw new DatabaseError("Failed to fetch post translation group");
    }

    const translationGroupId =
      (link as { translation_group_id?: string | null } | null)
        ?.translation_group_id ?? null;

    if (!translationGroupId) {
      return { postId, translationGroupId: null, postIds: [postId] };
    }

    const { data: links, error: linksError } = await this.db
      .from("post_translations")
      .select("post_id")
      .eq("translation_group_id", translationGroupId);

    if (linksError) {
      console.error("Supabase error:", linksError);
      throw new DatabaseError("Failed to fetch post translations");
    }

    const postIds = ((links ?? []) as Array<{ post_id?: string }>).map((row) =>
      row.post_id
    ).filter((id): id is string => Boolean(id));

    return {
      postId,
      translationGroupId,
      postIds: postIds.length > 0 ? postIds : [postId],
    };
  }

  private async getUsersById(
    userIds: string[],
  ): Promise<Map<string, CommentUser>> {
    const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueUserIds.length === 0) return new Map();

    const { data, error } = await this.db
      .from("users")
      .select("id, full_name, avatar_url")
      .in("id", uniqueUserIds);

    if (error) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to fetch comment users");
    }

    return new Map(
      ((data ?? []) as CommentUser[]).map((user) => [user.id, user]),
    );
  }

  private applyUnifiedCommentFilter(
    query: unknown,
    target: CommentTarget,
  ): unknown {
    if (!target.translationGroupId) {
      return (query as { eq: (column: string, value: string) => unknown }).eq(
        "post_id",
        target.postId,
      );
    }

    return (query as { or: (filters: string) => unknown }).or(
      `translation_group_id.eq.${target.translationGroupId},post_id.in.(${
        target.postIds.join(",")
      })`,
    );
  }

  async getUnifiedCommentsByPost(
    postId: string,
  ): Promise<CommentWithLanguage[]> {
    const target = await this.resolveCommentTarget(postId);
    let query = this.db
      .from("comments_with_language")
      .select(
        "id, post_id, translation_group_id, parent_id, user_id, content, created_at, updated_at, is_pinned, post_language, post_slug, post_title",
      )
      .is("parent_id", null)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    query = this.applyUnifiedCommentFilter(query, target) as typeof query;
    const { data: topLevelRows, error } = await query;

    if (error) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to fetch comments");
    }

    const topLevel = (topLevelRows ?? []) as CommentRowWithLanguage[];
    const parentIds = topLevel.map((comment) => String(comment.id ?? ""))
      .filter(Boolean);

    let replyRows: CommentRowWithLanguage[] = [];
    if (parentIds.length > 0) {
      const { data: replies, error: repliesError } = await this.db
        .from("comments_with_language")
        .select(
          "id, post_id, translation_group_id, parent_id, user_id, content, created_at, updated_at, is_pinned, post_language, post_slug, post_title",
        )
        .in("parent_id", parentIds)
        .order("created_at", { ascending: true });

      if (repliesError) {
        console.error("Supabase error:", repliesError);
        throw new DatabaseError("Failed to fetch comment replies");
      }

      replyRows = (replies ?? []) as CommentRowWithLanguage[];
    }

    const usersById = await this.getUsersById(
      [...topLevel, ...replyRows].map((row) => String(row.user_id ?? "")),
    );

    const repliesByParentId = new Map<string, CommentWithLanguage[]>();
    for (const row of replyRows) {
      const reply = this.normalizeCommentWithLanguage(row, usersById);
      const parentId = reply.parent_id;
      if (!parentId) continue;
      const replies = repliesByParentId.get(parentId) ?? [];
      replies.push(reply);
      repliesByParentId.set(parentId, replies);
    }

    return topLevel.map((row) => {
      const comment = this.normalizeCommentWithLanguage(row, usersById);
      comment.replies = repliesByParentId.get(comment.id) ?? [];
      return comment;
    });
  }

  async getCommentsByPost(postId: string): Promise<Comment[]> {
    const { data, error } = await this.db
      .from("comments")
      .select(
        "id, post_id, user_id, content, created_at, updated_at, is_pinned, user:users(id, full_name, avatar_url)",
      )
      .eq("post_id", postId)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to fetch comments");
    }

    return (data ?? []).map((
      row: Parameters<typeof this.normalizeComment>[0],
    ) => this.normalizeComment(row));
  }

  async getCommentById(commentId: string): Promise<Comment | null> {
    const { data, error } = await this.db
      .from("comments")
      .select(
        "id, post_id, user_id, content, created_at, updated_at, is_pinned",
      )
      .eq("id", commentId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to fetch comment");
    }

    return data as Comment;
  }

  async createComment(data: CommentInsert): Promise<Comment> {
    const { data: inserted, error } = await this.db
      .from("comments")
      .insert([
        {
          post_id: data.post_id,
          user_id: data.user_id,
          content: data.content,
          parent_id: data.parent_id ?? null,
          is_pinned: data.is_pinned ?? false,
        },
      ])
      .select(
        "id, post_id, translation_group_id, parent_id, user_id, content, created_at, updated_at, is_pinned, user:users(id, full_name, avatar_url)",
      )
      .single();

    if (error || !inserted) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to create comment");
    }

    return this.normalizeComment(inserted);
  }

  async updateComment(commentId: string, content: string): Promise<Comment> {
    const { data, error } = await this.db
      .from("comments")
      .update({ content })
      .eq("id", commentId)
      .select(
        "id, post_id, translation_group_id, parent_id, user_id, content, created_at, updated_at, is_pinned",
      )
      .single();

    if (error || !data) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to update comment");
    }

    return data as Comment;
  }

  async deleteComment(commentId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from("comments")
      .delete()
      .eq("id", commentId)
      .select("id");

    if (error) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to delete comment");
    }

    return Array.isArray(data) && data.length > 0;
  }

  async togglePinComment(
    commentId: string,
    isPinned: boolean,
  ): Promise<Comment> {
    const { data, error } = await this.db
      .from("comments")
      .update({ is_pinned: isPinned })
      .eq("id", commentId)
      .select(
        "id, post_id, translation_group_id, parent_id, user_id, content, created_at, updated_at, is_pinned",
      )
      .single();

    if (error || !data) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to update pin status");
    }

    return data as Comment;
  }

  async getCommentCount(postId: string): Promise<number> {
    const target = await this.resolveCommentTarget(postId);
    let query = this.db
      .from("comments")
      .select("id", { count: "exact", head: true });

    query = this.applyUnifiedCommentFilter(query, target) as typeof query;
    const { count, error } = await query;

    if (error) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to fetch comment count");
    }

    return count ?? 0;
  }

  async postExists(postId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from("posts")
      .select("id")
      .eq("id", postId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return false;
      }
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to verify post");
    }

    return Boolean(data?.id);
  }
}

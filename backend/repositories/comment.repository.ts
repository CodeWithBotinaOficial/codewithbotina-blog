import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase.ts";
import { Comment, CommentInsert } from "../types/comment.types.ts";
import { DatabaseError } from "../utils/errors.ts";

export class CommentRepository {
  private db: SupabaseClient;

  constructor(dbClient: SupabaseClient = supabase) {
    this.db = dbClient;
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

    return (data ?? []) as Comment[];
  }

  async getCommentById(commentId: string): Promise<Comment | null> {
    const { data, error } = await this.db
      .from("comments")
      .select("id, post_id, user_id, content, created_at, updated_at, is_pinned")
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
          is_pinned: data.is_pinned ?? false,
        },
      ])
      .select(
        "id, post_id, user_id, content, created_at, updated_at, is_pinned, user:users(id, full_name, avatar_url)",
      )
      .single();

    if (error || !inserted) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to create comment");
    }

    return inserted as Comment;
  }

  async updateComment(commentId: string, content: string): Promise<Comment> {
    const { data, error } = await this.db
      .from("comments")
      .update({ content })
      .eq("id", commentId)
      .select(
        "id, post_id, user_id, content, created_at, updated_at, is_pinned",
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

  async togglePinComment(commentId: string, isPinned: boolean): Promise<Comment> {
    const { data, error } = await this.db
      .from("comments")
      .update({ is_pinned: isPinned })
      .eq("id", commentId)
      .select("id, post_id, user_id, content, created_at, updated_at, is_pinned")
      .single();

    if (error || !data) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to update pin status");
    }

    return data as Comment;
  }

  async getCommentCount(postId: string): Promise<number> {
    const { count, error } = await this.db
      .from("comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", postId);

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

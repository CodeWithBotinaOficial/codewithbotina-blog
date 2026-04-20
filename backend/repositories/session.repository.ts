import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase.ts";
import { DatabaseError } from "../utils/errors.ts";

/**
 * Simple sessions repository to enforce 7-day session lifetime.
 * Stores a hash of the refresh token instead of the raw token.
 */
export class SessionRepository {
  private db: SupabaseClient;

  constructor(dbClient: SupabaseClient = supabase) {
    this.db = dbClient;
  }

  private async hashToken(token: string): Promise<string> {
    const utf8 = new TextEncoder().encode(token);
    const hashBuffer = await crypto.subtle.digest("SHA-256", utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  async createSession(
    refreshToken: string,
    userId: string,
    expiresAtIso: string,
  ): Promise<void> {
    try {
      const refresh_token_hash = await this.hashToken(refreshToken);
      const { error } = await this.db.from("auth_sessions").insert({
        user_id: userId,
        refresh_token_hash,
        expires_at: expiresAtIso,
      });

      if (error) {
        console.error("Supabase error creating session:", error);
        throw new DatabaseError("Failed to create session");
      }
    } catch (err) {
      console.error("SessionRepository.createSession error:", err);
      throw err;
    }
  }

  async getSessionByRefreshToken(refreshToken: string) {
    const refresh_token_hash = await this.hashToken(refreshToken);
    const { data, error } = await this.db
      .from("auth_sessions")
      .select("id, user_id, expires_at, created_at")
      .eq("refresh_token_hash", refresh_token_hash)
      .maybeSingle();

    if (error) {
      console.error("Supabase error fetching session:", error);
      throw new DatabaseError("Failed to fetch session");
    }

    return data ?? null;
  }

  async updateRefreshToken(oldRefreshToken: string, newRefreshToken: string) {
    const oldHash = await this.hashToken(oldRefreshToken);
    const newHash = await this.hashToken(newRefreshToken);

    const { error } = await this.db.from("auth_sessions").update({
      refresh_token_hash: newHash,
    }).eq("refresh_token_hash", oldHash);

    if (error) {
      console.error("Supabase error updating session hash:", error);
      throw new DatabaseError("Failed to update session token");
    }
  }

  async deleteSessionByRefreshToken(refreshToken: string) {
    const hash = await this.hashToken(refreshToken);
    const { error } = await this.db.from("auth_sessions").delete().eq(
      "refresh_token_hash",
      hash,
    );

    if (error) {
      console.error("Supabase error deleting session:", error);
      throw new DatabaseError("Failed to delete session");
    }
  }

  async deleteSessionsByUserId(userId: string) {
    const { error } = await this.db.from("auth_sessions").delete().eq("user_id", userId);
    if (error) {
      console.error("Supabase error deleting sessions by user:", error);
      throw new DatabaseError("Failed to delete sessions for user");
    }
  }
}


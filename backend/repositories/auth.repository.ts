import { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase.ts";
import { UserProfile } from "../types/auth.types.ts";
import { DatabaseError } from "../utils/errors.ts";

export class AuthRepository {
  private db: SupabaseClient;

  constructor(dbClient: SupabaseClient = supabase) {
    this.db = dbClient;
  }

  async getUserById(userId: string): Promise<UserProfile | null> {
    const { data, error } = await this.db
      .from("users")
      .select("id, email, full_name, avatar_url, google_id, created_at, last_login")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to fetch user profile");
    }

    return data as UserProfile | null;
  }

  async getUserByEmail(email: string): Promise<UserProfile | null> {
    const { data, error } = await this.db
      .from("users")
      .select("id, email, full_name, avatar_url, google_id, created_at, last_login")
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to fetch user by email");
    }

    return data as UserProfile | null;
  }

  async getUserByGoogleId(googleId: string): Promise<UserProfile | null> {
    const { data, error } = await this.db
      .from("users")
      .select("id, email, full_name, avatar_url, google_id, created_at, last_login")
      .eq("google_id", googleId)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to fetch user by Google ID");
    }

    return data as UserProfile | null;
  }

  async updateLastLogin(userId: string): Promise<void> {
    const { error } = await this.db
      .from("users")
      .update({ last_login: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to update last login");
    }
  }

  async isAdmin(userId: string): Promise<boolean> {
    const { data, error } = await this.db
      .from("admin_users")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Supabase error:", error);
      throw new DatabaseError("Failed to check admin status");
    }

    return Boolean(data);
  }
}

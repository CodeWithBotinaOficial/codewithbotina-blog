import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AuthRepository } from "../repositories/auth.repository.ts";
import { AuthSession, AuthenticatedUser, UserProfile } from "../types/auth.types.ts";
import { AppError } from "../utils/errors.ts";
import { supabase } from "../lib/supabase.ts";

interface ExchangeResult {
  session: AuthSession;
  userId: string;
}

export class AuthService {
  private authClient: SupabaseClient;
  private repository: AuthRepository;
  private adminClient: SupabaseClient;

  constructor(
    authClient?: SupabaseClient,
    repository: AuthRepository = new AuthRepository(),
    adminClient: SupabaseClient = supabase,
  ) {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ||
      "https://placeholder.supabase.co";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ||
      "placeholder-anon-key";

    if (!Deno.env.get("SUPABASE_URL") || !Deno.env.get("SUPABASE_ANON_KEY")) {
      console.warn(
        "Missing Supabase anon environment variables - using placeholders for build/dev",
      );
    }

    this.authClient = authClient ?? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    this.repository = repository;
    this.adminClient = adminClient;
  }

  async getGoogleAuthUrl(redirectTo: string): Promise<string> {
    const { data, error } = await this.authClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        scopes: "openid email profile",
        queryParams: {
          prompt: "select_account",
          access_type: "offline",
        },
      },
    });

    if (error || !data?.url) {
      console.error("OAuth URL error:", error);
      throw new AppError("Failed to initiate Google OAuth", 500);
    }

    return data.url;
  }

  async exchangeCodeForSession(code: string): Promise<ExchangeResult> {
    const { data, error } = await this.authClient.auth.exchangeCodeForSession(
      code,
    );

    if (error || !data.session) {
      console.error("OAuth exchange error:", error);
      throw new AppError("Failed to exchange code for session", 401);
    }

    const userId = data.session.user?.id || data.user?.id;

    if (!userId) {
      throw new AppError("Invalid session user", 401);
    }

    await this.repository.updateLastLogin(userId);

    return {
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        token_type: data.session.token_type,
      },
      userId,
    };
  }

  async getUserFromToken(token: string): Promise<AuthenticatedUser> {
    const { data, error } = await this.authClient.auth.getUser(token);

    if (error || !data.user) {
      console.error("Auth getUser error:", error);
      throw new AppError("Unauthorized", 401);
    }

    const profile = await this.repository.getUserById(data.user.id);
    const isAdmin = await this.repository.isAdmin(data.user.id);

    return {
      ...(profile ?? this.mapAuthUserToProfile(data.user)),
      is_admin: isAdmin,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<AuthSession> {
    const { data, error } = await this.authClient.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.session) {
      console.error("Refresh session error:", error);
      throw new AppError("Failed to refresh session", 401);
    }

    return {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      token_type: data.session.token_type,
    };
  }

  async signOut(token: string): Promise<void> {
    if (!token) return;

    const { error } = await this.adminClient.auth.admin.signOut(token, "global");

    if (error) {
      console.error("Sign out error:", error);
      throw new AppError("Failed to sign out", 500);
    }
  }

  async isAdmin(userId: string): Promise<boolean> {
    return await this.repository.isAdmin(userId);
  }

  private mapAuthUserToProfile(user: {
    id: string;
    email?: string;
    user_metadata?: Record<string, string>;
    created_at?: string;
  }): UserProfile {
    return {
      id: user.id,
      email: user.email ?? "",
      full_name: user.user_metadata?.full_name ?? null,
      avatar_url: user.user_metadata?.avatar_url ?? null,
      google_id: user.user_metadata?.sub ?? null,
      created_at: user.created_at ?? new Date().toISOString(),
      last_login: new Date().toISOString(),
    };
  }
}

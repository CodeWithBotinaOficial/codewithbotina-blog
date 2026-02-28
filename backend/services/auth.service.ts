import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AuthRepository } from "../repositories/auth.repository.ts";
import { AuthSession, AuthenticatedUser, UserProfile } from "../types/auth.types.ts";
import { AppError } from "../utils/errors.ts";
import { supabase } from "../lib/supabase.ts";

interface ExchangeResult {
  session: AuthSession;
  userId: string;
}

interface PkceTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user: { id: string };
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
      const message = error?.message
        ? `Failed to exchange code for session: ${error.message}`
        : "Failed to exchange code for session";
      throw new AppError(message, 401);
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

  async exchangeCodeForSessionWithVerifier(
    code: string,
    codeVerifier: string,
  ): Promise<ExchangeResult> {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ||
      "https://placeholder.supabase.co";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ||
      "placeholder-anon-key";

    const response = await fetch(
      `${supabaseUrl}/auth/v1/token?grant_type=pkce`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: anonKey,
        },
        body: JSON.stringify({
          auth_code: code,
          code_verifier: codeVerifier,
        }),
      },
    );

    const data = await response.json() as PkceTokenResponse & { error?: string };

    if (!response.ok || !data?.access_token || !data?.user?.id) {
      const message = data?.error
        ? `Failed to exchange code for session: ${data.error}`
        : "Failed to exchange code for session";
      throw new AppError(message, 401);
    }

    await this.repository.updateLastLogin(data.user.id);

    return {
      session: {
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        expires_in: data.expires_in,
        token_type: data.token_type,
      },
      userId: data.user.id,
    };
  }

  async getUserFromToken(token: string): Promise<AuthenticatedUser> {
    try {
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
    } catch (error) {
      const isAuthError = Boolean(
        (error as { __isAuthError?: boolean })?.__isAuthError ||
          (error as { name?: string })?.name === "AuthApiError",
      );
      console.error("Auth getUser exception:", error);
      throw new AppError(isAuthError ? "Unauthorized" : "Failed to fetch user", isAuthError ? 401 : 500);
    }
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

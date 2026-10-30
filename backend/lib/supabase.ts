import { createClient } from "supabase";

// supabase-js uses HTTP/REST (PostgREST), not raw PostgreSQL connections.
// pgBouncer connection pooling is not applicable here — Supabase handles
// HTTP connection management on their infrastructure.
// If direct PostgreSQL queries are added in the future, use the pooler URL:
// SUPABASE_DB_POOLER_URL=postgres://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true
const supabaseUrl = Deno.env.get("SUPABASE_URL") ||
  "https://placeholder.supabase.co";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ||
  "placeholder-key";

if (
  !Deno.env.get("SUPABASE_URL") || !Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
) {
  console.warn(
    "Missing Supabase environment variables - using placeholders for build/dev",
  );
}

export const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

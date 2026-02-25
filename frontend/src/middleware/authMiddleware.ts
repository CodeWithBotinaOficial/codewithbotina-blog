import { supabase } from "../lib/supabase";

export async function requireAuth(): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = "/auth/signin";
    return false;
  }
  return true;
}

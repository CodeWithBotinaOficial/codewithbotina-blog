-- Migration: Create delete_user_account function
-- Description: Transactionally delete a user account and associated data
-- Date: 2026-03-22

-- This function is called by the backend endpoint POST /api/users/delete-account.
-- It runs as SECURITY DEFINER so it can delete from auth schema and bypass RLS as needed.

CREATE OR REPLACE FUNCTION public.delete_user_account(target_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- Manual deletions (for explicit control and clarity).
  DELETE FROM public.comments WHERE user_id = target_user_id;
  DELETE FROM public.post_reactions WHERE user_id = target_user_id;
  DELETE FROM public.admin_users WHERE user_id = target_user_id;

  -- Optional tables: keep the function safe across environments.
  IF to_regclass('public.user_sessions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM public.user_sessions WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Supabase Auth tables may vary; attempt cleanup if present.
  IF to_regclass('auth.sessions') IS NOT NULL THEN
    EXECUTE 'DELETE FROM auth.sessions WHERE user_id = $1' USING target_user_id;
  END IF;

  IF to_regclass('auth.refresh_tokens') IS NOT NULL THEN
    EXECUTE 'DELETE FROM auth.refresh_tokens WHERE user_id = $1' USING target_user_id;
  END IF;

  -- Finally delete the auth user (cascades to public.users and any FK dependencies).
  DELETE FROM auth.users WHERE id = target_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user_account(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account(uuid) TO service_role;


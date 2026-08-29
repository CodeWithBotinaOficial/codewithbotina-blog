-- =============================================================================
-- PENDING DATABASE CHANGES — CodeWithBotina Blog
-- =============================================================================
-- Feature: Fix Scheduled Posts RLS and Status Constraint
-- Date: 2026-08-29
-- Branch: main
-- Context: Corrects RLS policies introduced by scheduled-post feature
--          that broke public post reading. Supabase requires SEPARATE policies
--          for public and admin access — combined OR with auth.uid() fails
--          for anonymous users.
-- =============================================================================

-- Step 1: Ensure scheduled_at column exists (idempotent)
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ DEFAULT NULL;

-- Step 2: Fix status constraint (idempotent)
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS check_status;
ALTER TABLE posts ADD CONSTRAINT posts_status_check
  CHECK (status IN ('draft', 'published', 'scheduled'));

-- Step 3: Fix any data issues from constraint application
UPDATE posts SET status = 'published'
WHERE status NOT IN ('draft', 'published', 'scheduled');

-- Step 4: Add index for scheduled posts (idempotent)
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at
ON posts(scheduled_at)
WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- Step 5: Add index for status queries
CREATE INDEX IF NOT EXISTS idx_posts_status_scheduled_at
ON posts(status, scheduled_at DESC)
WHERE scheduled_at IS NOT NULL;

-- Step 6: Fix RLS — SEPARATE policies (correct Supabase pattern)
-- Remove the broken combined policy
DROP POLICY IF EXISTS "Anyone can read published posts" ON posts;
DROP POLICY IF EXISTS "Admins can read all posts" ON posts;
DROP POLICY IF EXISTS "Public can read published posts" ON posts;

-- Policy 1: ANYONE (including anonymous) can read published posts
-- This is CRITICAL for RSS feeds and public post viewing
-- Using simple status check without auth.uid() ensures it works for anonymous users
CREATE POLICY "Public can read published posts"
ON posts FOR SELECT
USING (status = 'published');

-- Policy 2: Authenticated ADMINS can read ALL posts (draft, scheduled, published)
-- This policy is separate and only applies to authenticated users
CREATE POLICY "Admins can read all posts"
ON posts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM admin_users au
    WHERE au.user_id = auth.uid()
  )
);

-- =============================================================================
-- APPLY THIS SQL IN SUPABASE SQL EDITOR
-- After applying: run fish scripts/backup_db.fish and update migrations README
-- =============================================================================

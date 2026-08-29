-- =============================================================================
-- PENDING DATABASE CHANGES — CodeWithBotina Blog
-- =============================================================================
-- Feature: Scheduled Post Publishing
-- Date: 2026-08-29
-- Branch: feat/scheduled-post-publishing
-- =============================================================================

-- Step 1: Add status column to posts table (if it doesn't exist)
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS status VARCHAR NOT NULL DEFAULT 'draft';

-- Step 2: Data migration — Mark all existing posts as 'published'
-- All posts that existed before this feature are considered published
-- since they were immediately visible before the scheduling system
UPDATE posts
SET status = 'published'
WHERE status = 'draft';

-- Step 3: Add scheduled_at column to posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS scheduled_at TIMESTAMPTZ DEFAULT NULL;

-- Step 4: Update post status check constraint to include 'scheduled'
-- First, check existing constraint name
-- SELECT constraint_name FROM information_schema.table_constraints
-- WHERE table_name = 'posts' AND constraint_type = 'CHECK';

-- Drop existing status constraint (adjust constraint name to match yours)
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_status_check;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS check_status;

-- Add updated constraint including 'scheduled'
ALTER TABLE posts
ADD CONSTRAINT posts_status_check
CHECK (status IN ('draft', 'published', 'scheduled'));

-- Step 5: Index for efficient scheduled post queries
-- Used by the publish-scheduled cron endpoint
CREATE INDEX IF NOT EXISTS idx_posts_scheduled_at
ON posts(scheduled_at)
WHERE status = 'scheduled' AND scheduled_at IS NOT NULL;

-- Step 6: Index for admin queries showing scheduled posts
CREATE INDEX IF NOT EXISTS idx_posts_status_scheduled_at
ON posts(status, scheduled_at DESC)
WHERE scheduled_at IS NOT NULL;

-- Step 7: RLS Policy — scheduled posts only visible to admins
-- Non-admin users can only see published posts
-- This policy REPLACES the existing public read policy if you have one

-- Policy for public/authenticated users: only see published posts
DROP POLICY IF EXISTS "Anyone can read published posts" ON posts;
CREATE POLICY "Anyone can read published posts"
ON posts FOR SELECT
TO public
USING (
  status = 'published'
  OR (
    -- Admins can see all posts including scheduled and draft
    EXISTS (
      SELECT 1 FROM admin_users au
      WHERE au.user_id = auth.uid()
    )
  )
);

-- Step 8: Verify migration
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'posts' AND column_name IN ('status', 'scheduled_at');
-- Expected: status | character varying, scheduled_at | timestamp with time zone
--
-- SELECT COUNT(*) as total_posts, COUNT(CASE WHEN status = 'published' THEN 1 END) as published
-- FROM posts;
-- Expected: All existing posts should have status = 'published'

-- =============================================================================
-- After applying this SQL:
-- 1. Verify: Run the Step 8 verification queries in Supabase SQL editor
-- 2. Expected results:
--    - All existing posts have status = 'published'
--    - No posts have status = 'draft' unless newly created
--    - All columns (status, scheduled_at) exist with correct types
-- 3. Run: fish scripts/backup_db.fish
-- 4. Move backup to: docs/database/migrations/DD-MM-YYYY/
-- 5. Update: docs/database/migrations/README.md with migration notes
-- 6. Reset this file to placeholder once applied to production
-- =============================================================================

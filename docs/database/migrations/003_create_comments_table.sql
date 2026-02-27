-- Migration: Create comments table
-- Description: Store user comments on blog posts
-- Date: 2026-02-07

CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (LENGTH(content) >= 10 AND LENGTH(content) <= 1000),
  is_pinned BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add is_pinned column to existing comments table (safe if already present)
-- Migration: Update comments table with pinning feature
-- Description: Add is_pinned column and admin pinning functionality
-- Date: 2026-02-25
ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT FALSE;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_pinned ON comments(is_pinned DESC, created_at DESC);
DROP INDEX IF EXISTS idx_comments_created;
DROP INDEX IF EXISTS idx_comments_post_sorted;
CREATE INDEX IF NOT EXISTS idx_comments_post_sorted ON comments(post_id, is_pinned DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_pinned ON comments(is_pinned DESC, created_at DESC);
DROP INDEX IF EXISTS idx_comments_post_sorted;
CREATE INDEX IF NOT EXISTS idx_comments_post_sorted ON comments(post_id, is_pinned DESC, created_at DESC);

-- Trigger to update updated_at on edit
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER comments_updated_at
  BEFORE UPDATE ON comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

COMMENT ON TABLE comments IS 'User comments on blog posts';
COMMENT ON COLUMN comments.content IS 'Comment text (10-1000 characters)';
COMMENT ON COLUMN comments.is_pinned IS 'True if comment is pinned by admin (appears first)';

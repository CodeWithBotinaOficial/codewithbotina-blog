-- Add pinned column to posts table
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN posts.is_pinned IS
'Indicates if post is pinned/featured. Pinned posts appear first on homepage.';

-- Create index for efficient querying of pinned posts
CREATE INDEX IF NOT EXISTS idx_posts_pinned_language_fecha
ON posts(is_pinned DESC, language, fecha DESC)
WHERE is_pinned = TRUE;

-- Index for homepage queries (pinned first, then by date)
CREATE INDEX IF NOT EXISTS idx_posts_homepage_order
ON posts(language, is_pinned DESC, fecha DESC);

-- Update existing posts (all start as not pinned)
UPDATE posts SET is_pinned = FALSE WHERE is_pinned IS NULL;


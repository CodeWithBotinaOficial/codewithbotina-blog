-- Add Portuguese to language constraint
ALTER TABLE posts
DROP CONSTRAINT IF EXISTS posts_language_check;

ALTER TABLE posts
ADD CONSTRAINT posts_language_check
CHECK (language IN ('es', 'en', 'pt-br'));

-- Create index for Portuguese posts (performance)
CREATE INDEX IF NOT EXISTS idx_posts_language_ptbr
ON posts(language, fecha DESC)
WHERE language = 'pt-br';

-- Add comment
COMMENT ON COLUMN posts.language IS
'Post language: es (Spanish), en (English), pt-br (Brazilian Portuguese)';


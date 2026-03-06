-- ============================================
-- MIGRATION: Set all existing posts to Spanish
-- ============================================

-- 1. Add language column (if missing)
ALTER TABLE posts
ADD COLUMN IF NOT EXISTS language VARCHAR(5) DEFAULT 'es';

-- 2. Add constraint (if missing)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'valid_language'
      AND conrelid = 'posts'::regclass
  ) THEN
    ALTER TABLE posts
    ADD CONSTRAINT valid_language
    CHECK (language IN ('es', 'en', 'fr', 'de', 'pt', 'ja', 'zh'));
  END IF;
END $$;

-- 3. Add indexes (if missing)
CREATE INDEX IF NOT EXISTS idx_posts_language ON posts(language);
CREATE INDEX IF NOT EXISTS idx_posts_language_fecha ON posts(language, fecha DESC);

-- 4. Backup existing posts
CREATE TABLE IF NOT EXISTS posts_backup AS
SELECT * FROM posts;

-- 5. Update all existing posts to Spanish
UPDATE posts
SET language = 'es'
WHERE language IS NULL OR language = '';

-- 6. Verify migration
SELECT
  language,
  COUNT(*) as post_count
FROM posts
GROUP BY language;

-- Expected output:
-- | language | post_count |
-- |----------|------------|
-- | es       | [N posts]  |

-- Optional: add a timestamped comment to the backup table
DO $$
DECLARE
  comment_text text;
BEGIN
  comment_text := 'Backup created before i18n migration on ' || to_char(now(), 'YYYY-MM-DD HH24:MI:SS');
  EXECUTE format('COMMENT ON TABLE posts_backup IS %L', comment_text);
END $$;

-- ============================================
-- MIGRATION: Set all existing posts to Spanish
-- ============================================

-- 1. Backup existing posts
CREATE TABLE IF NOT EXISTS posts_backup AS
SELECT * FROM posts;

-- 2. Update all existing posts to Spanish
UPDATE posts
SET language = 'es'
WHERE language IS NULL OR language = '';

-- 3. Verify migration
SELECT
  language,
  COUNT(*) as post_count
FROM posts
GROUP BY language;

-- Expected output:
-- | language | post_count |
-- |----------|------------|
-- | es       | [N posts]  |

COMMENT ON TABLE posts_backup IS 'Backup created before i18n migration on ' || NOW();

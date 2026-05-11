-- Phase 2: Add Portuguese (pt-br) support to database constraints

-- 1. Update posts table constraint
-- First, try to drop the existing constraint if it has either of the common names
ALTER TABLE posts DROP CONSTRAINT IF EXISTS valid_language;
ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_language_check;

-- Add the updated constraint
ALTER TABLE posts
ADD CONSTRAINT valid_language
CHECK (language IN ('en', 'es', 'fr', 'de', 'pt', 'pt-br', 'ja', 'zh'));

-- 2. Update post_translations table constraint
ALTER TABLE post_translations DROP CONSTRAINT IF EXISTS post_translations_language_check;

ALTER TABLE post_translations
ADD CONSTRAINT post_translations_language_check
CHECK (language IN ('en', 'es', 'fr', 'de', 'pt', 'pt-br', 'ja', 'zh'));

-- 3. Update comments/metadata
COMMENT ON COLUMN posts.language IS 'Post language: en, es, fr, de, pt, pt-br, ja, zh';
COMMENT ON COLUMN post_translations.language IS 'Language code of the linked post (en, es, fr, de, pt, pt-br, ja, zh)';

-- 4. Ensure index for pt-br exists (from user's failed migration attempt)
CREATE INDEX IF NOT EXISTS idx_posts_language_ptbr
ON posts(language, fecha DESC)
WHERE language = 'pt-br';

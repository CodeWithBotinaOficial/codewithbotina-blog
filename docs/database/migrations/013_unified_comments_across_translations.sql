-- Migration: 013_unified_comments_across_translations.sql
-- Purpose: Enable comment aggregation across translated post versions
-- Date: 2026-08-09
-- Author: CodeWithBotina

BEGIN;

-- Step 1: Add parent_id and translation_group_id to comments table.
-- parent_id supports grouped replies. translation_group_id allows fast aggregation
-- across posts linked through public.post_translations.
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS translation_group_id UUID;

-- Step 2: Populate translation_group_id from existing post translation links.
UPDATE public.comments c
SET translation_group_id = pt.translation_group_id
FROM public.post_translations pt
WHERE c.post_id = pt.post_id
  AND c.translation_group_id IS NULL;

-- Step 3: Indexes for fast comment queries.
CREATE INDEX IF NOT EXISTS idx_comments_parent_id
ON public.comments(parent_id)
WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comments_translation_group_id
ON public.comments(translation_group_id)
WHERE translation_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comments_translation_group_created
ON public.comments(translation_group_id, created_at DESC)
WHERE translation_group_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_comments_translation_group_pinned
ON public.comments(translation_group_id, is_pinned DESC, created_at DESC)
WHERE translation_group_id IS NOT NULL;

-- Step 4: Trigger to auto-populate translation_group_id on new comments.
CREATE OR REPLACE FUNCTION public.set_comment_translation_group()
RETURNS TRIGGER AS $$
BEGIN
  SELECT pt.translation_group_id
  INTO NEW.translation_group_id
  FROM public.post_translations pt
  WHERE pt.post_id = NEW.post_id
  LIMIT 1;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_comment_translation_group ON public.comments;
CREATE TRIGGER trigger_set_comment_translation_group
  BEFORE INSERT OR UPDATE OF post_id ON public.comments
  FOR EACH ROW
  EXECUTE FUNCTION public.set_comment_translation_group();

-- Step 5: Keep existing comments in sync when posts are linked/unlinked later.
CREATE OR REPLACE FUNCTION public.sync_comments_translation_group_from_post_link()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.comments
    SET translation_group_id = NULL
    WHERE post_id = OLD.post_id;
    RETURN OLD;
  END IF;

  UPDATE public.comments
  SET translation_group_id = NEW.translation_group_id
  WHERE post_id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_comments_translation_group_from_post_link
  ON public.post_translations;
CREATE TRIGGER trigger_sync_comments_translation_group_from_post_link
  AFTER INSERT OR UPDATE OF translation_group_id OR DELETE ON public.post_translations
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_comments_translation_group_from_post_link();

-- Step 6: Create a view for unified comment retrieval with language info.
CREATE OR REPLACE VIEW public.comments_with_language AS
SELECT
  c.*,
  p.language AS post_language,
  p.slug AS post_slug,
  p.titulo AS post_title
FROM public.comments c
JOIN public.posts p ON c.post_id = p.id;

-- Step 7: Verification query (run after migration to check data integrity).
-- SELECT c.id, c.post_id, c.translation_group_id, pt.translation_group_id AS post_translation_group_id, pt.language
-- FROM public.comments c
-- JOIN public.post_translations pt ON c.post_id = pt.post_id
-- WHERE c.translation_group_id IS NULL
-- LIMIT 10;
-- Expected: 0 rows.

COMMIT;

-- ROLLBACK SCRIPT (if needed):
-- BEGIN;
-- DROP TRIGGER IF EXISTS trigger_sync_comments_translation_group_from_post_link ON public.post_translations;
-- DROP FUNCTION IF EXISTS public.sync_comments_translation_group_from_post_link();
-- DROP TRIGGER IF EXISTS trigger_set_comment_translation_group ON public.comments;
-- DROP FUNCTION IF EXISTS public.set_comment_translation_group();
-- DROP VIEW IF EXISTS public.comments_with_language;
-- DROP INDEX IF EXISTS public.idx_comments_translation_group_id;
-- DROP INDEX IF EXISTS public.idx_comments_translation_group_created;
-- DROP INDEX IF EXISTS public.idx_comments_translation_group_pinned;
-- DROP INDEX IF EXISTS public.idx_comments_parent_id;
-- ALTER TABLE public.comments DROP COLUMN IF EXISTS translation_group_id;
-- ALTER TABLE public.comments DROP COLUMN IF EXISTS parent_id;
-- COMMIT;

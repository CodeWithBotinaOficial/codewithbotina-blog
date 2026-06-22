-- Migration: Unify post reactions across language versions
-- Purpose: Share likes/dislikes across every post in the same translation group.
-- Date: 2026-06-22

BEGIN;

ALTER TABLE public.post_reactions
ADD COLUMN IF NOT EXISTS translation_group_id UUID;

UPDATE public.post_reactions pr
SET translation_group_id = COALESCE(pt.translation_group_id, pr.post_id)
FROM public.posts p
LEFT JOIN public.post_translations pt ON pt.post_id = p.id
WHERE pr.post_id = p.id
  AND pr.translation_group_id IS NULL;

DELETE FROM public.post_reactions pr
USING public.post_reactions newer
WHERE pr.user_id = newer.user_id
  AND pr.translation_group_id = newer.translation_group_id
  AND pr.id <> newer.id
  AND (
    pr.created_at < newer.created_at
    OR (pr.created_at = newer.created_at AND pr.id < newer.id)
  );

ALTER TABLE public.post_reactions
ALTER COLUMN translation_group_id SET NOT NULL;

DROP INDEX IF EXISTS public.idx_post_reactions_user_group_unique;
DROP INDEX IF EXISTS public.idx_post_reactions_translation_group_id;

CREATE INDEX idx_post_reactions_translation_group_id
  ON public.post_reactions(translation_group_id);

CREATE UNIQUE INDEX idx_post_reactions_user_group_unique
  ON public.post_reactions(user_id, translation_group_id);

COMMENT ON COLUMN public.post_reactions.translation_group_id
  IS 'Effective post translation group. For unlinked posts this is the post_id.';

COMMIT;

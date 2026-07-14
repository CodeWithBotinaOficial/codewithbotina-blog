-- Migration: Add poll translation support
-- Purpose: Link polls across languages with unified voting and results.
-- Date: 2026-07-14

BEGIN;

ALTER TABLE public.polls
ADD COLUMN IF NOT EXISTS translation_group_id UUID;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fk_polls_translation_group'
      AND conrelid = 'public.polls'::regclass
  ) THEN
    ALTER TABLE public.polls
    ADD CONSTRAINT fk_polls_translation_group
      FOREIGN KEY (translation_group_id)
      REFERENCES public.polls(id)
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_polls_translation_group_id
  ON public.polls(translation_group_id);

DROP INDEX IF EXISTS public.idx_polls_translation_group_language_unique;
CREATE UNIQUE INDEX idx_polls_translation_group_language_unique
  ON public.polls(translation_group_id, language)
  WHERE translation_group_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.enforce_poll_translation_type_match()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  expected_type text;
BEGIN
  IF NEW.translation_group_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT type INTO expected_type
  FROM public.polls
  WHERE id = NEW.translation_group_id;

  IF expected_type IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.type <> expected_type THEN
    RAISE EXCEPTION 'Cannot link polls of different types: % != %', NEW.type, expected_type
      USING ERRCODE = '23514';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.polls p
    WHERE p.translation_group_id = NEW.translation_group_id
      AND p.id <> NEW.id
      AND p.type <> NEW.type
  ) THEN
    RAISE EXCEPTION 'Cannot link polls of different types in translation group %', NEW.translation_group_id
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_polls_translation_type_match ON public.polls;
CREATE TRIGGER trg_polls_translation_type_match
BEFORE INSERT OR UPDATE OF translation_group_id, type
ON public.polls
FOR EACH ROW
EXECUTE FUNCTION public.enforce_poll_translation_type_match();

ALTER TABLE public.poll_votes
ADD COLUMN IF NOT EXISTS translation_group_id UUID;

UPDATE public.poll_votes pv
SET translation_group_id = COALESCE(p.translation_group_id, p.id)
FROM public.polls p
WHERE pv.poll_id = p.id
  AND pv.translation_group_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_poll_votes_translation_group_id
  ON public.poll_votes(translation_group_id);

CREATE INDEX IF NOT EXISTS idx_poll_votes_user_translation_group
  ON public.poll_votes(user_id, translation_group_id);

COMMENT ON COLUMN public.polls.translation_group_id
  IS 'Links translated polls to a root poll id. NULL if standalone.';

COMMENT ON COLUMN public.poll_votes.translation_group_id
  IS 'Effective poll translation group for unified vote counting. Standalone votes use poll_id.';

CREATE OR REPLACE VIEW public.mismatched_poll_translations AS
WITH option_counts AS (
  SELECT poll_id, COUNT(*)::integer AS option_count
  FROM public.poll_options
  GROUP BY poll_id
)
SELECT
  p1.id AS poll_1_id,
  p1.slug AS poll_1_slug,
  p1.language AS poll_1_lang,
  p1.type AS type,
  COALESCE(oc1.option_count, 0) AS poll_1_option_count,
  p2.id AS poll_2_id,
  p2.slug AS poll_2_slug,
  p2.language AS poll_2_lang,
  COALESCE(oc2.option_count, 0) AS poll_2_option_count
FROM public.polls p1
JOIN public.polls p2
  ON p1.translation_group_id = p2.translation_group_id
LEFT JOIN option_counts oc1 ON oc1.poll_id = p1.id
LEFT JOIN option_counts oc2 ON oc2.poll_id = p2.id
WHERE p1.id < p2.id
  AND p1.translation_group_id IS NOT NULL
  AND p1.type IN ('single_choice', 'multiple_choice')
  AND p2.type IN ('single_choice', 'multiple_choice')
  AND COALESCE(oc1.option_count, 0) <> COALESCE(oc2.option_count, 0);

COMMIT;

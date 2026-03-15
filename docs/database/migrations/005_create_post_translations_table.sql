-- Migration: Create post_translations table
-- Description: Link equivalent posts across languages via translation groups
-- Date: 2026-03-15

-- Junction table: each post belongs to at most one translation group.
-- A translation group can have at most one post per language.
CREATE TABLE IF NOT EXISTS public.post_translations (
  post_id UUID PRIMARY KEY REFERENCES public.posts(id) ON DELETE CASCADE,
  translation_group_id UUID NOT NULL,
  language TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT post_translations_language_check
    CHECK (language IN ('en', 'es', 'fr', 'de', 'pt', 'ja', 'zh')),
  CONSTRAINT post_translations_group_language_unique
    UNIQUE (translation_group_id, language)
);

-- Indexes for frequent lookups
CREATE INDEX IF NOT EXISTS idx_post_translations_group
  ON public.post_translations(translation_group_id);

CREATE INDEX IF NOT EXISTS idx_post_translations_language
  ON public.post_translations(language);

-- (translation_group_id, language) already has a unique index via the UNIQUE constraint above.

-- Row Level Security
ALTER TABLE public.post_translations ENABLE ROW LEVEL SECURITY;

-- Public read access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'post_translations'
      AND policyname = 'Public can read post translations'
  ) THEN
    CREATE POLICY "Public can read post translations"
      ON public.post_translations
      FOR SELECT
      USING (true);
  END IF;
END $$;

-- Admin-only write access (insert/update/delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'post_translations'
      AND policyname = 'Admins can write post translations'
  ) THEN
    CREATE POLICY "Admins can write post translations"
      ON public.post_translations
      FOR ALL
      USING (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()))
      WITH CHECK (EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid()));
  END IF;
END $$;

-- Helper: get all translations for any post in a group (includes the input post itself if linked).
CREATE OR REPLACE FUNCTION public.get_post_translations(input_post_id UUID)
RETURNS TABLE (
  post_id UUID,
  language TEXT
)
LANGUAGE sql
STABLE
AS $$
  WITH grp AS (
    SELECT translation_group_id
    FROM public.post_translations
    WHERE post_translations.post_id = input_post_id
  )
  SELECT pt.post_id, pt.language
  FROM public.post_translations pt
  JOIN grp ON grp.translation_group_id = pt.translation_group_id;
$$;

-- Helper: get the post_id for a specific language translation of a post (or NULL if missing).
CREATE OR REPLACE FUNCTION public.get_translation_for_language(input_post_id UUID, target_language TEXT)
RETURNS UUID
LANGUAGE sql
STABLE
AS $$
  WITH grp AS (
    SELECT translation_group_id
    FROM public.post_translations
    WHERE post_translations.post_id = input_post_id
  )
  SELECT pt.post_id
  FROM public.post_translations pt
  JOIN grp ON grp.translation_group_id = pt.translation_group_id
  WHERE pt.language = target_language
  LIMIT 1;
$$;

-- Helper: create a translation group for a set of post IDs.
-- Notes:
-- - Requires admin (checked explicitly).
-- - Validates: posts exist; languages are unique; language codes are supported.
-- - If any post is already in a group, this function will raise.
CREATE OR REPLACE FUNCTION public.create_translation_group(input_post_ids UUID[])
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  group_id UUID := gen_random_uuid();
  is_admin BOOLEAN;
  post_count INT;
  existing_links INT;
  dup_lang_count INT;
BEGIN
  SELECT EXISTS (SELECT 1 FROM public.admin_users au WHERE au.user_id = auth.uid())
    INTO is_admin;
  IF NOT is_admin THEN
    RAISE EXCEPTION 'Forbidden' USING ERRCODE = '42501';
  END IF;

  IF input_post_ids IS NULL OR array_length(input_post_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'post_ids[] is required' USING ERRCODE = '22023';
  END IF;

  -- Validate posts exist.
  SELECT COUNT(*)
    INTO post_count
  FROM public.posts p
  WHERE p.id = ANY (input_post_ids);

  IF post_count <> array_length(input_post_ids, 1) THEN
    RAISE EXCEPTION 'One or more post_ids do not exist' USING ERRCODE = 'P0002';
  END IF;

  -- Ensure none are already linked.
  SELECT COUNT(*)
    INTO existing_links
  FROM public.post_translations pt
  WHERE pt.post_id = ANY (input_post_ids);

  IF existing_links > 0 THEN
    RAISE EXCEPTION 'One or more posts are already in a translation group' USING ERRCODE = '23505';
  END IF;

  -- Validate unique languages.
  SELECT COUNT(*) - COUNT(DISTINCT p.language)
    INTO dup_lang_count
  FROM public.posts p
  WHERE p.id = ANY (input_post_ids);

  IF dup_lang_count > 0 THEN
    RAISE EXCEPTION 'Only one post per language is allowed in a translation group' USING ERRCODE = '23505';
  END IF;

  INSERT INTO public.post_translations (post_id, translation_group_id, language)
  SELECT p.id, group_id, p.language
  FROM public.posts p
  WHERE p.id = ANY (input_post_ids);

  RETURN group_id;
END;
$$;

COMMENT ON TABLE public.post_translations IS 'Junction table linking equivalent posts across languages.';
COMMENT ON COLUMN public.post_translations.translation_group_id IS 'Posts with the same translation_group_id are translations of the same article.';
COMMENT ON COLUMN public.post_translations.language IS 'Language code of the linked post (en, es, fr, de, pt, ja, zh).';


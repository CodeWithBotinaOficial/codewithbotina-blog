# Database Schema

This document summarizes the core database schema for the blog, with emphasis on the `posts.language` column used for i18n.

## Posts Table (Core Blog Content)

**Purpose:** Store blog posts and support language-specific filtering for the bilingual site.

**Key columns:**
- `id`: UUID (primary key)
- `titulo`: VARCHAR(200)
- `slug`: VARCHAR(200)
- `body`: TEXT
- `imagen_url`: TEXT (nullable)
- `fecha`: TIMESTAMP WITH TIME ZONE
- `updated_at`: TIMESTAMP WITH TIME ZONE (nullable)
- `language`: VARCHAR(5)

**`language` column details:**
- Type: `VARCHAR(5)`
- Default: `'es'`
- Constraint: `CHECK (language IN ('es', 'en', 'fr', 'de', 'pt', 'ja', 'zh'))`
- Purpose: Ensures posts are stored and queried by language for i18n.

**Indexes:**
- `idx_posts_language` on `posts(language)`
- `idx_posts_language_fecha` on `posts(language, fecha DESC)`

## Tags and Junction Table

- `tags`: SEO-friendly tags
- `post_tags`: Many-to-many relationship between posts and tags

## Post Translations (Cross-Language Linking)

Equivalent posts across languages are linked via:

- `post_translations`: Junction table connecting posts into translation groups (one post per language per group)

See: `docs/database/post-translations-schema.md`

## Validation Rules

- Only supported language codes are allowed by the database constraint.
- The API rejects unsupported language values.

## Admin Usage

- The post editor includes a language selector.
- Admins choose the language at creation or update time.

## Query Usage (in words)

- To show English posts, filter results so `language` equals `en`.
- To show Spanish posts, filter results so `language` equals `es`.
- Do not mix languages in a single listing to avoid SEO and UX issues.

## Migration Summary

All existing posts are set to Spanish (`es`) during migration. See the migration guide for details and rollback steps:

- `docs/migrations/add-language-column.md`

## Related Docs

- `docs/i18n-implementation.md`
- `docs/tag-system.md`
- `docs/SEO.md`

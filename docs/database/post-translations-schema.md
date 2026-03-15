# Post Translations Schema

This document describes how the blog links equivalent posts across languages without changing the `posts` table.

## Overview

- Each post can belong to **at most one** translation group.
- A translation group can contain **at most one post per language**.
- The linkage is stored in a junction table: `public.post_translations`.

Conceptually:

```
posts (id, slug, language, ...)
   1
   |
   |  (post_id)
   |
post_translations (post_id, translation_group_id, language)
                      |
                      | (same translation_group_id)
                      |
                 "translation group"
```

## Table: `public.post_translations`

Each row represents **one post in one language**. All rows with the same `translation_group_id` are translations of the same article.

### Columns

- `post_id UUID` (PK): References `posts(id)` with `ON DELETE CASCADE`.
- `translation_group_id UUID` (NOT NULL): Shared identifier for the translation group.
- `language TEXT` (NOT NULL): Language code for the post (validated via check constraint).
- `created_at TIMESTAMPTZ` (NOT NULL): Insert timestamp.

### Constraints

- `PRIMARY KEY (post_id)`: Ensures each post appears only once.
- `UNIQUE (translation_group_id, language)`: Ensures at most one post per language per group.
- `FOREIGN KEY (post_id) -> posts(id) ON DELETE CASCADE`.
- `CHECK (language IN (...))`: Ensures language codes are supported.

### Indexes

- `idx_post_translations_group (translation_group_id)`: Fast lookup of all translations in a group.
- `idx_post_translations_language (language)`: Fast filtering by language.
- `(translation_group_id, language)`: Backed by the unique constraint index.

## Migration SQL

Apply: [005_create_post_translations_table.sql](/home/zeus/Development-Environment/codewithbotina/codewithbotina-blog/docs/database/migrations/005_create_post_translations_table.sql)

## Row Level Security (RLS)

RLS is enabled on `post_translations`:

- **Public read**: Any user can `SELECT` translation links.
- **Admin-only write**: Only users present in `public.admin_users` (matched by `auth.uid()`) can `INSERT/UPDATE/DELETE`.

Policies created by the migration:

- `Public can read post translations`
- `Admins can write post translations`

Note: The backend API in this repo uses a Supabase service-role key, so it bypasses RLS. Admin-only write access must still be enforced at the API layer (and is enforced by `requireAdmin` on the write endpoints).

## Helper Functions

The migration also creates helper functions:

### `get_post_translations(post_id UUID)`

Returns all `(post_id, language)` rows in the same translation group as the input post.

Example:

```sql
select * from public.get_post_translations('post-uuid-here');
```

### `get_translation_for_language(post_id UUID, target_language TEXT)`

Returns the `post_id` of the matching translation (or `NULL`).

Example:

```sql
select public.get_translation_for_language('post-uuid-here', 'en');
```

### `create_translation_group(post_ids UUID[])`

Creates a new translation group and links all provided posts.

- Requires admin (`admin_users.user_id = auth.uid()`).
- Validates: all posts exist; languages are unique; posts are not already linked.

Example:

```sql
select public.create_translation_group(array[
  'spanish-post-uuid'::uuid,
  'english-post-uuid'::uuid
]);
```

## Query Examples

### Get English version of a Spanish post

```sql
with en_post_id as (
  select public.get_translation_for_language('spanish-post-uuid'::uuid, 'en') as id
)
select id, slug, titulo
from public.posts
where id = (select id from en_post_id);
```

### Get all translations of a post

```sql
select
  pt.language,
  p.id,
  p.slug,
  p.titulo
from public.get_post_translations('any-post-in-group'::uuid) pt
join public.posts p on p.id = pt.post_id
order by pt.language;
```

### Check if a translation exists

```sql
select public.get_translation_for_language('post-uuid'::uuid, 'es') is not null as exists;
```

## Admin Usage Guide (Database-Level)

Preferred approach: use the admin UI + API endpoints in this repo.

If you need to manage links directly in SQL:

1. Ensure your Supabase auth user is present in `public.admin_users`.
2. Use `create_translation_group(...)` for new groups.
3. For manual edits, update/insert/delete rows in `public.post_translations` while respecting:
   - One row per post (`post_id` unique).
   - One post per language per group (`translation_group_id, language` unique).


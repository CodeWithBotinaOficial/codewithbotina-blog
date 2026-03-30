# Multi-Language Posts (Simultaneous Post Translation)

## Overview

Each language version of a post is stored as a separate row in `posts` with its own `language`, `slug`, `titulo`, `body`, `imagen_url`, and tag links. Language versions are linked together through the `post_translations` table (shared `translation_group_id`).

This enables an admin workflow similar to Contentful: create and edit multiple languages in a single interface.

## UI Workflow (Admin)

### Create Post

1. Select a **Primary Language**.
2. Select optional **Translations** (one or more languages).
3. Fill title/slug/content per language section.
4. Choose tags:
   - Per-language tags (default), or
   - Shared tags across all versions.
5. Choose images:
   - One image for all versions (default), or
   - Custom image per language.
6. Submit to create all language versions and link them.

### Edit Post

1. Open any post in `/[lang]/admin/edit-post/[slug]`.
2. If translations are linked, the editor loads all linked versions.
3. You can:
   - Update fields for one or more languages and save once.
   - Add a new translation language (creates a new `posts` row and links it).
   - Unlink a translation (removes the link but does not delete the post).

## Database Model

### `posts`

One row per language version.

Key fields:

- `id` (UUID)
- `language` (e.g. `en`, `es`)
- `slug` (unique per language)
- `titulo`
- `body`
- `imagen_url`

### `post_translations`

Links post rows into the same translation group:

- `post_id` (UUID, PK)
- `translation_group_id` (UUID)
- `language` (should match `posts.language`)

When a translation is unlinked, its `post_translations` row is removed. If a group is reduced to one post, the remaining row is cleaned up so the post becomes standalone.

## API Usage

### Create (Single)

`POST /api/posts/create`

```json
{
  "titulo": "Introducción a React",
  "slug": "introduccion-a-react",
  "body": "...",
  "language": "es",
  "imagen_url": null,
  "tag_ids": ["..."]
}
```

### Create (Batch)

`POST /api/posts/create`

```json
{
  "posts": [
    { "titulo": "Introducción a React", "slug": "introduccion-a-react", "body": "...", "language": "es" },
    { "titulo": "Introduction to React", "slug": "introduction-to-react", "body": "...", "language": "en" }
  ]
}
```

If `posts.length > 1`, the backend links the created posts into a shared `translation_group_id`.

### Bulk Update (Multi-Language Edit)

`PUT /api/posts/bulk-update`

```json
{
  "updates": [
    {
      "post_id": "POST_UUID",
      "post": {
        "titulo": "Updated title",
        "slug": "updated-slug",
        "body": "...",
        "language": "en",
        "imagen_url": null,
        "tag_ids": ["..."]
      }
    }
  ],
  "creates": [
    {
      "base_post_id": "BASE_POST_UUID",
      "post": {
        "titulo": "Nueva traduccion",
        "slug": "nueva-traduccion",
        "body": "...",
        "language": "es"
      }
    }
  ],
  "unlinks": [
    { "post_id": "BASE_POST_UUID", "linked_post_id": "LINKED_POST_UUID" }
  ]
}
```

Notes:

- Updates are applied per `post_id` to avoid cross-language data mixing.
- The backend attempts best-effort rollback if any step fails.

## Testing Notes

- Backend coverage includes integration tests for batch create and bulk update route wiring.
- Translation linking logic is exercised via the existing translation service tests and API translation tests.


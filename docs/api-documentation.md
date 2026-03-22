# API Documentation (Blog)

Base URL: `https://api.codewithbotina.com`

This document highlights post-related endpoints and the new `language` field used for i18n.

## Posts

### POST `/api/posts/create`

Create a new post (admin only).

**Request body (JSON):**
- `titulo` (string, required)
- `slug` (string, required)
- `body` (string, required)
- `imagen_url` (string, optional)
- `tag_ids` (string[], optional)
- `language` (string, required)

**Language requirements:**
- Only supported codes are allowed: `es`, `en`, `fr`, `de`, `pt`, `ja`, `zh`.
- Invalid values return a validation error.

**Response:**
- Includes `language` in the created post payload.

### PUT `/api/posts/:slug/update`

Update an existing post (admin only).

**Request body (JSON):**
- Same fields as create.
- `language` is accepted and validated.

**Behavior:**
- Slug uniqueness is scoped by language.
- Updates persist the post language.

### GET `/api/posts`

List posts with optional language filtering.

**Query parameters:**
- `language` (optional) — filters by language.
- `q` (optional) — basic title/slug substring search (autocomplete-style).
- `limit` (optional) — defaults to 20.
- `offset` (optional) — defaults to 0.

**Language filtering (in words):**
- To list English posts, filter results where the post language equals `en`.
- To list Spanish posts, filter results where the post language equals `es`.

### GET `/api/posts/:slug`

Fetch a single post by slug.

**Query parameters:**
- `language` (optional) — fetch a specific language variant.

**Response notes:**
- Includes a `tags` array with tag metadata for the post.

## Post Translations

These endpoints link equivalent posts across languages (different slugs) and are used by the language switcher and admin editor.

### GET `/api/posts/:postId/translations`

Returns all translations for a post (public).

**Response:**

- `data.translations`: Array of `{ post_id, language, slug, titulo, fecha, imagen_url, translation_group_id }`

### GET `/api/posts/:postId/translation/:language`

Returns the translation for a specific language (public).

- `200` if found
- `404` if the translation does not exist

Used by the frontend language switcher to redirect to `/{lang}/posts/{translated_slug}`.

### POST `/api/posts/:postId/translations` (Admin only)

Links one or more posts as translations.

**Request body (JSON):**

- `linked_post_ids` (string[], required)

**Validation:**

- Cannot link a post to itself.
- Only one post per language is allowed in a translation group.

**Behavior:**

- Merges translation groups as needed when linking posts that are already linked.
- If `linked_post_ids` is an empty array, the API unlinks the current post from its translation group.

### DELETE `/api/posts/:postId/translations/:linkedPostId` (Admin only)

Unlinks one post from the translation group.

## Storage Images (Admin)

### GET `/api/storage/images` (Admin only)

Lists images from the Supabase Storage bucket used for blog images (`blog-images`).

**Query parameters:**
- `limit` (optional) — default 48, max 100
- `offset` (optional) — default 0
- `q` (optional) — substring filter on filename (best-effort)

**Response:**
- `data.images`: Array of `{ name, url, size, mimetype, created_at, updated_at }`

## Validation Rules (Language)

- Requests with unsupported language codes are rejected by the API and the database constraint.
- The default language for existing content is `es`.

## Users (Authenticated)

### GET `/api/users/profile`

Fetch the current user's profile dashboard data.

**Authentication:** Required (cookie-based session).

**Query parameters:**
- `limit` (optional) — liked posts to return, defaults to 20, max 200.
- `offset` (optional) — pagination offset, defaults to 0.

**Response:**
- `data.stats.likes_given` (number)
- `data.stats.dislikes_given` (number)
- `data.stats.comments_posted` (number)
- `data.liked_posts_total` (number)
- `data.liked_posts` (array) — items contain `liked_at` and a `post` object (`id`, `titulo`, `slug`, `language`, `imagen_url`)

### POST `/api/users/delete-account`

Permanently delete the current user's account and all associated data.

**Authentication:** Required (cookie-based session). A user can only delete their own account.

**Request body:** none

**Response:**
- `data.deleted` (boolean)

**Notes:**
- The backend clears auth cookies on success, signing the user out immediately.
- Deletion is executed transactionally via a database function (`delete_user_account`).

## Related Docs

- `docs/database-schema.md`
- `docs/i18n-implementation.md`

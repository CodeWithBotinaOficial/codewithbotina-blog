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

**Note:** The frontend currently reads posts directly from Supabase. If a public listing endpoint is exposed, it must support language filtering.

**Language filtering (in words):**
- To list English posts, filter results where the post language equals `en`.
- To list Spanish posts, filter results where the post language equals `es`.

## Validation Rules (Language)

- Requests with unsupported language codes are rejected by the API and the database constraint.
- The default language for existing content is `es`.

## Related Docs

- `docs/database-schema.md`
- `docs/i18n-implementation.md`

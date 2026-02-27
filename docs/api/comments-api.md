# Comments API

Base URL: `/api/comments`

## Overview

- Public visibility: anyone can read comments.
- Authentication required to create, update, delete, pin, or unpin.
- Author-only edit/delete permissions.
- Admin-only pin/unpin and moderation delete.
- Sorting: pinned comments first, then newest.

## Data Shape

```json
{
  "id": "uuid",
  "content": "Great post!",
  "created_at": "2026-02-25T10:00:00Z",
  "updated_at": "2026-02-25T10:00:00Z",
  "is_pinned": false,
  "user": {
    "id": "uuid",
    "full_name": "Diego Botina",
    "avatar_url": "https://..."
  }
}
```

## Endpoints

### GET `/api/comments/:postId`

Fetch all comments for a post. Public access.

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "content": "Great post!",
      "created_at": "2026-02-25T10:00:00Z",
      "updated_at": "2026-02-25T10:00:00Z",
      "is_pinned": true,
      "user": {
        "id": "uuid",
        "full_name": "Diego Botina",
        "avatar_url": "https://..."
      }
    }
  ],
  "meta": {
    "total": 1,
    "pinned_count": 1
  }
}
```

Errors:
- 500 Internal Server Error

### POST `/api/comments/:postId`

Create a new comment. Requires authentication.

Headers:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

Request:
```json
{
  "content": "This is my comment"
}
```

Validation:
- Content: 10-1000 characters after sanitization
- No HTML tags allowed (sanitized)
- Rate limit: 10 comments per hour per user
- Post must exist

Response (201):
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "content": "This is my comment",
    "created_at": "2026-02-25T10:00:00Z",
    "is_pinned": false,
    "user": {
      "id": "uuid",
      "full_name": "Diego Botina",
      "avatar_url": "https://..."
    }
  }
}
```

Errors:
- 400 Validation failed
- 401 Unauthorized
- 404 Post not found
- 429 Rate limit exceeded

### PUT `/api/comments/:commentId`

Update an existing comment. Author only.

Headers:
```
Authorization: Bearer {access_token}
Content-Type: application/json
```

Request:
```json
{
  "content": "Updated comment text"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "content": "Updated comment text",
    "updated_at": "2026-02-25T10:30:00Z"
  }
}
```

Errors:
- 400 Validation failed
- 401 Unauthorized
- 403 Forbidden
- 404 Comment not found

### DELETE `/api/comments/:commentId`

Delete a comment. Authors can delete their own comments. Admins can delete any comment.

Headers:
```
Authorization: Bearer {access_token}
```

Response:
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

Errors:
- 401 Unauthorized
- 403 Forbidden
- 404 Comment not found

### POST `/api/comments/:commentId/pin`

Pin a comment. Admin only.

Headers:
```
Authorization: Bearer {access_token}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "is_pinned": true,
    "updated_at": "2026-02-25T10:00:00Z"
  }
}
```

Errors:
- 401 Unauthorized
- 403 Forbidden
- 400 Comment already pinned
- 404 Comment not found

### POST `/api/comments/:commentId/unpin`

Unpin a comment. Admin only.

Headers:
```
Authorization: Bearer {access_token}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "is_pinned": false,
    "updated_at": "2026-02-25T10:00:00Z"
  }
}
```

Errors:
- 401 Unauthorized
- 403 Forbidden
- 400 Comment is not pinned
- 404 Comment not found

## Architecture Diagram

```text
Client (Astro + Preact)
  -> Comments UI (CommentForm, CommentList, CommentItem)
  -> /api/comments/:postId (GET/POST)
  -> /api/comments/:commentId (PUT/DELETE)
  -> /api/comments/:commentId/pin (POST)
  -> /api/comments/:commentId/unpin (POST)

Backend (Fresh API)
  -> CommentService (validation, auth checks, rate limit)
  -> CommentRepository (Supabase queries)
  -> Supabase (comments, users, admin_users, posts)
```

## Troubleshooting

- 401 Unauthorized: Ensure the `Authorization` header includes a valid access token.
- 403 Forbidden: Confirm the user is the comment author or is an admin.
- 404 Not found: Verify the `postId` or `commentId` exists.
- 429 Rate limit exceeded: Wait for the 1-hour window to reset.
- Missing user data in response: Ensure the `users` table contains `full_name` and `avatar_url` for the commenter.

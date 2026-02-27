# Reactions API

Base URL: `/api/reactions`

## Overview

- Public read access for reaction counts.
- Authenticated users can toggle like/dislike.
- One reaction per user per post.

## Endpoints

### GET `/api/reactions/:postId`

Get reaction counts for a post. Public access.

Response:
```json
{
  "success": true,
  "data": {
    "post_id": "uuid",
    "likes": 42,
    "dislikes": 3,
    "total": 45
  }
}
```

Errors:
- 500 Internal Server Error

### GET `/api/reactions/user/:postId`

Get the authenticated user's reaction for a post.

Headers:
```
Authorization: Bearer {access_token}
```

Response:
```json
{
  "success": true,
  "data": {
    "user_reaction": "like"
  }
}
```

Notes:
- `user_reaction` can be `like`, `dislike`, or `null`.

Errors:
- 401 Unauthorized
- 500 Internal Server Error

### POST `/api/reactions/:postId/like`

Toggle like for a post.

Logic:
- No reaction → add like
- Like → remove like
- Dislike → switch to like

Headers:
```
Authorization: Bearer {access_token}
```

Response:
```json
{
  "success": true,
  "data": {
    "reaction": "like",
    "counts": {
      "likes": 43,
      "dislikes": 3,
      "total": 46
    }
  }
}
```

Errors:
- 401 Unauthorized
- 500 Internal Server Error

### POST `/api/reactions/:postId/dislike`

Toggle dislike for a post.

Logic:
- No reaction → add dislike
- Dislike → remove dislike
- Like → switch to dislike

Headers:
```
Authorization: Bearer {access_token}
```

Response:
```json
{
  "success": true,
  "data": {
    "reaction": "dislike",
    "counts": {
      "likes": 42,
      "dislikes": 4,
      "total": 46
    }
  }
}
```

Errors:
- 401 Unauthorized
- 500 Internal Server Error

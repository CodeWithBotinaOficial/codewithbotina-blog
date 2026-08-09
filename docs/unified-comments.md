# Unified Comments Across Post Translations

## Overview

When a post has linked translations via `post_translations.translation_group_id`,
all comments from all language versions are displayed together in every version
of that post.

## How It Works

### Database Layer

- `comments.translation_group_id` stores the translation group for fast lookup.
- New comments keep their current `post_id`; a trigger copies the group from
  `post_translations` when the comment is inserted.
- Existing comments are synced when posts are linked or unlinked later.
- `comments_with_language` exposes comment rows with source post language,
  slug, and title.

### Backend Layer

- `CommentRepository.getUnifiedCommentsByPost()` resolves the current post's
  translation group.
- Linked posts are queried together. Standalone posts still query by `post_id`.
- Replies are returned under their parent comment.
- Comment counts use the same unified lookup.

### Frontend Layer

- `CommentItem` shows a language badge for comments from another post language.
- `CommentList` shows a unified-comments notice when the post has translations.
- New comments are still posted to the current post.

## Business Rules

| Rule                     | Behavior                                                 |
| ------------------------ | -------------------------------------------------------- |
| Post has no translations | Only its own comments shown                              |
| Post has translations    | All linked versions' comments shown                      |
| New comment created      | Saved to current `post_id`; trigger sets group           |
| Pinned comment           | Pinned across all versions                               |
| Replies                  | Stay grouped under their parent                          |
| User delete              | User can delete their own comments                       |
| Admin moderation         | Admin can delete or pin comments from any linked version |

## Language Badges

| Language  | Badge    |
| --------- | -------- |
| English   | 🇺🇸 EN    |
| Español   | 🇪🇸 ES    |
| Português | 🇧🇷 PT-BR |

## Migration

Run `docs/database/migrations/013_unified_comments_across_translations.sql` in
the Supabase SQL editor.

## Rollback

The migration file includes a rollback script at the bottom.

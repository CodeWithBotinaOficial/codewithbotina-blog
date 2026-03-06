# Migration: Add `language` Column to `posts`

## Purpose

Adds a `language` column to the `posts` table to enable bilingual content (English/Spanish) and enforce supported language codes.

## Script

Migration script:

- `scripts/migrate-posts-to-spanish.sql`

## What the Script Does

1. Creates a backup table: `posts_backup`.
2. Sets all existing posts to Spanish (`es`).
3. Provides a verification query to count posts per language.

## Backup Strategy

A full backup of the `posts` table is created in `posts_backup` before the update.

## Rollback Procedure

If you need to revert:

1. Drop or rename the current `posts` table.
2. Restore from `posts_backup`.
3. Re-apply any schema changes needed after rollback.

## Verification Steps

After running the script:

- Confirm all legacy posts have `language = 'es'`.
- Validate that new posts require a supported language.
- Ensure queries are filtering by language where needed.

## Notes

The database enforces supported values with:

```
CHECK (language IN ('es', 'en', 'fr', 'de', 'pt', 'ja', 'zh'))
```

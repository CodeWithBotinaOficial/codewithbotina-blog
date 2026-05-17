# Pinned/Featured Posts System

## Overview

Admins can pin posts to feature them prominently. Pinned posts appear first on the homepage within the current language.

## Database

Column: `posts.is_pinned` (BOOLEAN)

- `true`: post is pinned/featured
- `false`: regular post

Migration: `docs/database/migrations/008_add_pinned_posts.sql`

## Admin Controls

### Editor (Multi-language)

`MultiLanguagePostEditor` supports:

- Pin all translations (single checkbox)
- Pin selected languages (per-language checkboxes)

Pinned state is written via the existing `bulk-update` admin save flow.

### Quick Toggle

- `POST /api/posts/{slug}/pin?language={lang}` toggles pin for that language version (admin-only)
- `POST /api/posts/bulk-pin` can pin/unpin multiple post IDs (admin-only)

## UI Indicators

- Post cards show a star icon (filled when pinned) and a pinned badge
- Individual post pages show a "Featured Post" banner when pinned


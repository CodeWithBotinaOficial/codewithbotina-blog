# Internationalization (i18n)

## Overview

CodeWithBotina is bilingual (English and Spanish) using language-prefixed URLs and server-side language filtering. The system avoids mixed-language content and keeps Supabase queries scoped by language for performance.

## Supported Languages

- English (`en`) – default
- Spanish (`es`)

## URL Structure

```
/en/                → English homepage
/en/posts/my-post   → English post
/es/                → Spanish homepage
/es/posts/mi-post   → Spanish post
```

Static pages are localized by route segment:

```
/en/about                 → English about
/es/acerca-de             → Spanish about
/en/privacy-policy        → English privacy policy
/es/politica-de-privacidad → Spanish privacy policy
```

## Language Detection

Priority order:

1. `preferred_language` cookie
2. `Accept-Language` header
3. Default (`en`)

Detection happens in middleware and on root redirect pages. When no cookie is set, the middleware persists the detected language for one year.

Cookie settings:

```
preferred_language=<lang>
Path=/
Max-Age=31536000
SameSite=Lax
Secure
```

## Translation System

Translations live in `frontend/src/i18n` and are mirrored to `frontend/public/locales` for any client usage.

```
frontend/src/i18n/
├── en/
│   ├── common.json
│   ├── post.json
│   ├── admin.json
│   ├── auth.json
│   └── legal.json
└── es/
    ├── common.json
    ├── post.json
    ├── admin.json
    ├── auth.json
    └── legal.json
```

A lightweight `t()` helper in `frontend/src/lib/i18n.ts` resolves keys by namespace and supports variable interpolation.

## Posts: Language Column

The posts table includes a `language` column. All post fetches are filtered server-side by language.

```ts
const { data } = await supabase
  .from("posts")
  .select("*")
  .eq("language", "en")
  .order("fecha", { ascending: false });
```

Slug uniqueness checks are scoped by language in the backend.

## Admin Workflow

- The post editor includes a language selector.
- Slug uniqueness is checked per language.
- After saving, the editor redirects to `/${language}/posts/${slug}`.
- Admin entry points include `?lang=en|es` to preselect language.

## Static Content by Language

Static pages are split per language using markdown files.

```
content/en/about.md
content/es/about.md
legal-docs/en/*.md
legal-docs/es/*.md
```

Each page loads the correct file based on the language route.

## SEO

### Canonical URLs

Every localized page sets a canonical URL for its language.

### Hreflang

All public pages include `hreflang` alternates, including `x-default` pointing to English.

### Language-Specific Sitemaps

- `/sitemap.xml` is a sitemap index.
- `/en/sitemap.xml` and `/es/sitemap.xml` list language-specific URLs.

### Language-Specific RSS

- `/rss.xml` redirects to the detected language feed.
- `/en/rss.xml` and `/es/rss.xml` contain posts for a single language only.

## Middleware Behavior

`frontend/src/middleware/index.ts`:

- Redirects non-localized routes to a language-prefixed route.
- Skips `/admin`, `/auth`, `/api`, and static assets.
- Sets the `preferred_language` cookie when missing.

## Migration

A migration helper script is included:

```
scripts/migrate-posts-to-spanish.sql
```

This sets existing posts to Spanish and creates a backup table.

## Testing Checklist

- [ ] Visiting `/` redirects to `/en/` or `/es/` based on detection
- [ ] `/en/*` and `/es/*` do not mix languages
- [ ] Post queries filter by language
- [ ] Admin post editor language selector works
- [ ] `hreflang` tags present on public pages
- [ ] `/sitemap.xml` and `/{lang}/sitemap.xml` render
- [ ] `/rss.xml` redirects and language feeds load

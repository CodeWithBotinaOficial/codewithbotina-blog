# SEO and Indexing Guide (CodeWithBotina)

**Last updated:** 2026-03-04

This document describes how SEO is implemented and how indexing artifacts (RSS, sitemap, structured data) are generated, cached, and updated.

## 1. SEO Architecture Overview

**Dynamic pages**
- Posts: `/posts/[slug]` (SSR, `prerender = false`)
- Tags: `/tags/[slug]` (SSR, `prerender = false`)

**Static pages**
- Home, About, Contact, legal docs, etc.

## 2. Canonical URLs

All post pages and tag pages set canonical URLs to prevent duplicates.

- Posts: `https://blog.codewithbotina.com/posts/{slug}`
- Tags: `https://blog.codewithbotina.com/tags/{slug}`

## 2.1 Pagination SEO (Home and Tag Pages)

Homepage and tag pages support query-based pagination:

- `/{lang}/?page=N&per_page=10|50|100`
- `/{lang}/tags/{slug}?page=N&per_page=10|50|100`

SEO behavior:

- Page 1 with the default density (10 per page) uses the base canonical URL (no query params).
- Page 2+ and/or custom `per_page` values use a self-referential canonical URL including query params.
- `rel="prev"` / `rel="next"` links are rendered when applicable.

## 3. Meta Tags

**Post pages** (`/posts/[slug]`):
- Title, description, canonical
- Open Graph for social sharing (article)
- Twitter cards
- `article:published_time`, `article:modified_time`, `article:author`
- `meta keywords` from tags (when tags exist)

**Tag pages** (`/tags/[slug]`):
- Title, description, canonical
- Open Graph for sharing

## 4. Structured Data (JSON-LD)

**Posts:** `BlogPosting` schema including:
- `headline`, `image`, `datePublished`, `dateModified`
- `author` and `publisher`
- `description`
- `keywords` from tags

**Tag pages:** `CollectionPage` schema including:
- `ItemList` of post URLs
- Tag description

## 5. Sitemap

**URL:** `/sitemap.xml`

**Included:**
- Homepage
- All posts
- All tag pages

**Caching:**
- Server sends `Cache-Control: public, max-age=3600`

**Update frequency:**
- Posts are updated immediately in the database.
- The sitemap endpoint is dynamic but cached. Expect updates to appear within **up to 1 hour** because of cache headers and CDN caching.

## 6. RSS Feed

**URL:** `/rss.xml`

**Included:**
- Last 50 posts
- Post title, URL, publish date, description, full content
- Optional image enclosure

**Caching:**
- Server sends `Cache-Control: public, max-age=3600`

**Update frequency:**
- Posts are fetched dynamically from the database.
- The RSS endpoint is cached at the edge and by most RSS readers.
- Expect updates to appear within **up to 1 hour** after publishing a new post.
- Many RSS readers also poll on their own schedule (sometimes every few hours).

**If you need faster updates:**
- Reduce RSS cache TTL (e.g. 5–10 minutes).
- Clear CDN cache for `/rss.xml` after publishing.

## 7. Robots

**URL:** `/robots.txt`

Current configuration allows crawling and points to `/sitemap.xml`.

## 8. Tag SEO

- Tags are stored in a many-to-many schema (`tags`, `post_tags`).
- Each tag has a landing page at `/tags/{slug}` with structured data.
- Tags are included in post meta keywords and Open Graph `article:tag`.
- Post pages render tag chips that link to `/tags/{slug}` for internal linking.
- If public tag reads are blocked by RLS, post pages use the backend tags API as a fallback.

## 9. Indexing Workflow

1. Publish post.
2. Post appears immediately in database.
3. RSS/Sitemap will reflect the post **after cache expires** (up to 1 hour).
4. Search engines crawl sitemap or RSS and index the post.

## 10. Monitoring

Recommended checks:
- View source on a post page and confirm meta tags and JSON-LD.
- Validate structured data in Google Rich Results Test.
- Validate `/sitemap.xml` and `/rss.xml` directly in browser.
- Use `site:blog.codewithbotina.com` to confirm indexing.

## 11. Files of Interest

- RSS: `frontend/src/pages/rss.xml.ts`
- Sitemap: `frontend/src/pages/sitemap.xml.ts`
- Posts: `frontend/src/pages/posts/[slug].astro`
- Tag pages: `frontend/src/pages/tags/[slug].astro`
- Robots: `frontend/public/robots.txt`

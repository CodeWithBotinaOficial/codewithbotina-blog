# Hybrid Rendering Strategy

This project uses Astro hybrid rendering to keep static pages fast while allowing request-time data for dynamic content.

## What Is Dynamic

- Homepage posts list
- Post pages (content, reactions, comments)

These pages set:

```
export const prerender = false;
```

## Why Hybrid

- New posts appear without rebuilds
- Reactions and comments stay fresh
- Cloudflare Pages Functions handle request-time rendering at no extra cost

## Caching

Cache rules live in `frontend/public/_headers`:

```
/posts/*
  Cache-Control: public, s-maxage=300, stale-while-revalidate=600

/
  Cache-Control: public, s-maxage=60, stale-while-revalidate=300
```

Use shorter TTLs if updates need to appear faster.

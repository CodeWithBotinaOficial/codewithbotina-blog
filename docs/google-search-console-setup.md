# Google Search Console Setup Guide

## Prerequisites

- Google account
- Access to deploy `https://blog.codewithbotina.com`

## 1. Add Property

1. Open Google Search Console.
2. Click **Add property**.
3. Select **URL prefix**.
4. Enter: `https://blog.codewithbotina.com`
5. Click **Continue**.

## 2. Verify Ownership

### Option A: HTML File Upload (Recommended)

1. Download the verification HTML file from Google.
2. Place it in `frontend/public/` (so it is served from the site root).
3. Deploy the site.
4. Click **Verify** in Search Console.

### Option B: Meta Tag

1. Copy the verification meta tag from Google.
2. Set `PUBLIC_GOOGLE_SITE_VERIFICATION` in the frontend environment.
3. Deploy the site.
4. Click **Verify** in Search Console.

## 3. Submit Sitemaps

In **Sitemaps**, submit:

- `https://blog.codewithbotina.com/sitemap.xml`
- `https://blog.codewithbotina.com/en/sitemap.xml`
- `https://blog.codewithbotina.com/es/sitemap.xml`
- `https://blog.codewithbotina.com/pt-br/sitemap.xml`

## 4. Request Indexing (Priority URLs)

Use **URL Inspection** and request indexing for:

- `https://blog.codewithbotina.com/` (redirects to a language home)
- `https://blog.codewithbotina.com/en/`
- `https://blog.codewithbotina.com/es/`
- `https://blog.codewithbotina.com/pt-br/`
- A few recent post URLs in each language

## 5. Monitor Coverage + Enhancements

Check:

- **Pages** (indexing status, exclusions, crawled not indexed)
- **Sitemaps** (fetch status and discovered URLs)
- **Enhancements / Rich results** (structured data issues)
- **Core Web Vitals** (field data)

## Troubleshooting Checklist

- Confirm `https://blog.codewithbotina.com/robots.txt` allows crawling and lists sitemaps.
- Confirm `https://blog.codewithbotina.com/sitemap.xml` and `/{lang}/sitemap.xml` return valid XML.
- View source on a post page and confirm:
  - canonical URL is `https://blog.codewithbotina.com/...`
  - hreflang alternates exist for all languages
  - JSON-LD is present and valid
- Use `site:blog.codewithbotina.com codewithbotina` in Google after Google has had time to recrawl.


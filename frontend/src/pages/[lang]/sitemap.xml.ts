import type { APIRoute } from "astro";
import { supabase } from "../../lib/supabase";
import { getApiUrl, getSiteUrl } from "../../lib/env";
import { DEFAULT_LANGUAGE, getRoutePath, isSupportedLanguage, SUPPORTED_LANGUAGES, type SupportedLanguage } from "../../lib/i18n";

export const prerender = false;

function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function buildAlternateLinks(siteUrl: string, path: string): string {
  return SUPPORTED_LANGUAGES.map((lang) => {
    const href = `${siteUrl}/${lang}${path}`;
    return `<xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`;
  }).join("");
}

function buildRouteAlternates(siteUrl: string, routeKey: Parameters<typeof getRoutePath>[1]): string {
  return SUPPORTED_LANGUAGES.map((lang) => {
    const href = `${siteUrl}${getRoutePath(lang, routeKey)}`;
    return `<xhtml:link rel="alternate" hreflang="${lang}" href="${href}" />`;
  }).join("");
}

export const GET: APIRoute = async ({ params }) => {
  const paramLang = params.lang ?? "";
  const language = isSupportedLanguage(paramLang)
    ? (paramLang as SupportedLanguage)
    : DEFAULT_LANGUAGE;

  const siteUrl = getSiteUrl().replace(/\/$/, "");
  const apiUrl = getApiUrl().replace(/\/$/, "");

  let posts: Array<{ slug?: string | null; language?: string | null; fecha?: string | null; updated_at?: string | null }> = [];
  try {
    const { data, error } = await supabase
      .from("posts")
      .select("slug, language, fecha, updated_at")
      .order("fecha", { ascending: false });
    if (error) throw error;
    posts = data || [];
  } catch (error) {
    console.error("Sitemap posts fetch error:", error);
    posts = [];
  }

  const postsBySlug = new Map<string, Array<{ slug: string; language: string; fecha?: string | null; updated_at?: string | null }>>();
  posts.forEach((post) => {
    if (!post.slug || !post.language) return;
    const slug = post.slug;
    const entry = {
      slug,
      language: post.language,
      fecha: post.fecha,
      updated_at: post.updated_at,
    };
    if (!postsBySlug.has(slug)) {
      postsBySlug.set(slug, [entry]);
    } else {
      postsBySlug.get(slug)?.push(entry);
    }
  });

  let tags: Array<{ slug?: string | null; updated_at?: string | null; created_at?: string | null }> = [];
  try {
    const { data: tagData, error: tagError } = await supabase
      .from("tags")
      .select("slug, updated_at, created_at")
      .order("usage_count", { ascending: false });
    if (tagError) throw tagError;
    tags = tagData || [];
  } catch (_error) {
    try {
      const response = await fetch(`${apiUrl}/api/tags`);
      if (response.ok) {
        const payload = await response.json();
        tags = payload?.data?.tags ?? payload?.tags ?? [];
      }
    } catch (_fetchError) {
      tags = [];
    }
  }

  const staticUrls = [
    {
      loc: `/${language}/`,
      alternates: SUPPORTED_LANGUAGES.map((lang) =>
        `<xhtml:link rel="alternate" hreflang="${lang}" href="${siteUrl}/${lang}/" />`).join(""),
      changefreq: "daily",
      priority: "1.0",
    },
    {
      loc: getRoutePath(language, "about"),
      alternates: buildRouteAlternates(siteUrl, "about"),
      changefreq: "monthly",
      priority: "0.6",
    },
    {
      loc: getRoutePath(language, "contact"),
      alternates: buildRouteAlternates(siteUrl, "contact"),
      changefreq: "monthly",
      priority: "0.6",
    },
    {
      loc: `/${language}/tags`,
      alternates: buildAlternateLinks(siteUrl, "/tags"),
      changefreq: "weekly",
      priority: "0.6",
    },
    {
      loc: getRoutePath(language, "privacyPolicy"),
      alternates: buildRouteAlternates(siteUrl, "privacyPolicy"),
      changefreq: "yearly",
      priority: "0.4",
    },
    {
      loc: getRoutePath(language, "termsOfService"),
      alternates: buildRouteAlternates(siteUrl, "termsOfService"),
      changefreq: "yearly",
      priority: "0.4",
    },
    {
      loc: getRoutePath(language, "cookiePolicy"),
      alternates: buildRouteAlternates(siteUrl, "cookiePolicy"),
      changefreq: "yearly",
      priority: "0.4",
    },
    {
      loc: getRoutePath(language, "dataDeletion"),
      alternates: buildRouteAlternates(siteUrl, "dataDeletion"),
      changefreq: "yearly",
      priority: "0.4",
    },
  ];

  const staticXml = staticUrls.map((item) => `
  <url>
    <loc>${siteUrl}${item.loc}</loc>
    ${item.alternates}
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`).join("");

  const postUrls = posts
    .filter((post) => post.language === language)
    .reduce((acc: string[], post) => {
      const slug = typeof post.slug === "string" ? post.slug : "";
      if (!slug) return acc;
      const lastmod = toIsoDate(post.updated_at || post.fecha);
      const versions = postsBySlug.get(slug) ?? [];
      const alternateLinks = versions
        .filter((version) => SUPPORTED_LANGUAGES.includes(version.language as SupportedLanguage))
        .map((version) => {
          return `<xhtml:link rel="alternate" hreflang="${version.language}" href="${siteUrl}/${version.language}/posts/${slug}" />`;
        })
        .join("");

      acc.push(`
  <url>
    <loc>${siteUrl}/${language}/posts/${slug}</loc>
    ${alternateLinks}
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
      return acc;
    }, [])
    .join("");

  const tagUrls = tags.reduce((acc: string[], tag) => {
    const slug = typeof tag.slug === "string" ? tag.slug : "";
    if (!slug) return acc;
    const lastmod = toIsoDate(tag.updated_at || tag.created_at);
    acc.push(`
  <url>
    <loc>${siteUrl}/${language}/tags/${slug}</loc>
    ${buildAlternateLinks(siteUrl, `/tags/${slug}`)}
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
    return acc;
  }, []).join("");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${staticXml}${postUrls}${tagUrls}
</urlset>`;

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
};

import type { APIRoute } from "astro";
import { supabase } from "../lib/supabase";
import { getSiteUrl } from "../lib/env";

export const prerender = false;

function toIsoDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

export const GET: APIRoute = async () => {
  const siteUrl = getSiteUrl().replace(/\/$/, "");

  const buildResponse = (urls: string) =>
    new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${urls}
</urlset>`,
      {
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
        },
      },
    );

  try {
    let posts: Array<{ slug?: string | null; fecha?: string | null; updated_at?: string | null }> = [];

    const { data, error } = await supabase
      .from("posts")
      .select("slug, fecha, updated_at")
      .order("fecha", { ascending: false });

    if (error) {
      const message = String(error?.message || "");
      if (message.includes("updated_at")) {
        const fallback = await supabase
          .from("posts")
          .select("slug, fecha")
          .order("fecha", { ascending: false });
        if (fallback.error) throw fallback.error;
        posts = fallback.data || [];
      } else {
        throw error;
      }
    } else {
      posts = data || [];
    }

    const postUrls = posts.reduce((acc: string[], post) => {
      const slug = typeof post.slug === "string" ? post.slug : "";
      if (!slug) return acc;
      const lastmod = toIsoDate(post.updated_at || post.fecha);
      acc.push(`
  <url>
    <loc>${siteUrl}/posts/${slug}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`);
      return acc;
    }, []).join("");

    let tags: Array<{ slug?: string | null; updated_at?: string | null; created_at?: string | null }> = [];
    try {
      const { data: tagData, error: tagError } = await supabase
        .from("tags")
        .select("slug, updated_at, created_at")
        .order("usage_count", { ascending: false });

      if (!tagError) {
        tags = tagData || [];
      }
    } catch (_error) {
      tags = [];
    }

    const tagUrls = tags.reduce((acc: string[], tag) => {
      const slug = typeof tag.slug === "string" ? tag.slug : "";
      if (!slug) return acc;
      const lastmod = toIsoDate(tag.updated_at || tag.created_at);
      acc.push(`
  <url>
    <loc>${siteUrl}/tags/${slug}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>`);
      return acc;
    }, []).join("");

    return buildResponse(`${postUrls}${tagUrls}`);
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return buildResponse("");
  }
};

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
  try {
    const { data: posts, error } = await supabase
      .from("posts")
      .select("slug, fecha, updated_at")
      .order("fecha", { ascending: false });

    if (error) {
      throw error;
    }

    const siteUrl = getSiteUrl().replace(/\/$/, "");

    const urls = (posts || []).map((post) => {
      const lastmod = toIsoDate(post.updated_at || post.fecha);
      return `
  <url>
    <loc>${siteUrl}/posts/${post.slug}</loc>
    ${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;
    }).join("");

    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${siteUrl}</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  ${urls}
</urlset>`;

    return new Response(sitemap, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return new Response("Error generating sitemap", { status: 500 });
  }
};

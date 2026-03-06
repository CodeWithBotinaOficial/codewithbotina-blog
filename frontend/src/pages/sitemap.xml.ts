import type { APIRoute } from "astro";
import { getSiteUrl } from "../lib/env";
import { SUPPORTED_LANGUAGES } from "../lib/i18n";

export const prerender = false;

export const GET: APIRoute = async () => {
  const siteUrl = getSiteUrl().replace(/\\/$/, \"\");
  const lastmod = new Date().toISOString();

  const entries = SUPPORTED_LANGUAGES.map((lang) => `
  <sitemap>
    <loc>${siteUrl}/${lang}/sitemap.xml</loc>
    <lastmod>${lastmod}</lastmod>
  </sitemap>`).join(\"\");

  const xml = `<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<sitemapindex xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n${entries}\n</sitemapindex>`;

  return new Response(xml, {
    headers: {
      \"Content-Type\": \"application/xml; charset=utf-8\",
      \"Cache-Control\": \"public, max-age=3600\",
    },
  });
};

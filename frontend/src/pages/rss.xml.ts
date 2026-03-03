import type { APIRoute } from "astro";
import { supabase } from "../lib/supabase";
import { getSiteUrl } from "../lib/env";
import { stripMarkdown, truncateText } from "../lib/utils";

export const prerender = false;

const MAX_ITEMS = 50;

function escapeCdata(value: string): string {
  return value.replace(/]]>/g, "]]><![CDATA[>");
}

function escapeXmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildDescription(content: string, length: number): string {
  const plain = stripMarkdown(content).replace(/\s+/g, " ").trim();
  return truncateText(plain, length);
}

export const GET: APIRoute = async () => {
  try {
    const { data: posts, error } = await supabase
      .from("posts")
      .select("id, titulo, slug, body, imagen_url, fecha, excerpt")
      .order("fecha", { ascending: false })
      .limit(MAX_ITEMS);

    if (error) {
      throw error;
    }

    const siteUrl = getSiteUrl().replace(/\/$/, "");
    const currentDate = new Date().toUTCString();

    const items = (posts || []).map((post) => {
      const postUrl = `${siteUrl}/posts/${post.slug}`;
      const pubDate = post.fecha ? new Date(post.fecha).toUTCString() : currentDate;
      const description = buildDescription(post.excerpt || post.body, 200);
      const imageUrl = post.imagen_url ? escapeXmlAttr(post.imagen_url) : "";

      return `
    <item>
      <title><![CDATA[${escapeCdata(post.titulo)}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${pubDate}</pubDate>
      <description><![CDATA[${escapeCdata(description)}]]></description>
      ${imageUrl ? `<enclosure url="${imageUrl}" type="image/jpeg"/>` : ""}
      <content:encoded><![CDATA[${escapeCdata(post.body)}]]></content:encoded>
    </item>`;
    }).join("");

    const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0"
     xmlns:atom="http://www.w3.org/2005/Atom"
     xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>CodeWithBotina</title>
    <description>Technical insights on software development, programming tutorials, and best practices</description>
    <link>${siteUrl}</link>
    <language>es</language>
    <lastBuildDate>${currentDate}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
    ${items}
  </channel>
</rss>`;

    return new Response(rss, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("RSS generation error:", error);
    return new Response("Error generating RSS feed", { status: 500 });
  }
};

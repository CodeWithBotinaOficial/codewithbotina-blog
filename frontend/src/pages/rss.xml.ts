import type { APIRoute } from "astro";
import { detectLanguage } from "../lib/i18n";

export const prerender = false;

export const GET: APIRoute = async ({ request, cookies }) => {
  const language = detectLanguage(cookies, request.headers.get("accept-language"));
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/${language}/rss.xml`,
    },
  });
};

import { defineMiddleware } from "astro:middleware";
import { detectLanguage, getLocalizedPath, setLanguagePreference } from "../lib/i18n";

const STATIC_PREFIXES = ["/_astro/", "/favicon", "/robots.txt", "/sitemap", "/rss.xml", "/og-image", "/logo", "/assets/"];
const EXCLUDED_PREFIXES = ["/admin", "/auth", "/api"]; 

export const onRequest = defineMiddleware(async ({ request, cookies, redirect, url }, next) => {
  const pathname = url.pathname;

  if (STATIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return next();
  }

  if (EXCLUDED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return next();
  }

  const hasLangPrefix = /^\/(en|es)(\/|$)/.test(pathname);
  if (hasLangPrefix) {
    return next();
  }

  const language = detectLanguage(cookies, request.headers.get("accept-language"));
  if (!cookies.get("preferred_language")) {
    setLanguagePreference(cookies, language);
  }

  const target = getLocalizedPath(pathname, language);
  return redirect(target, 302);
});

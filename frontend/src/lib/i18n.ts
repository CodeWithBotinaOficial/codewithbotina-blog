import type { AstroCookies } from "astro";
import enCommon from "../i18n/en/common.json";
import enPost from "../i18n/en/post.json";
import enAdmin from "../i18n/en/admin.json";
import enAuth from "../i18n/en/auth.json";
import enLegal from "../i18n/en/legal.json";
import esCommon from "../i18n/es/common.json";
import esPost from "../i18n/es/post.json";
import esAdmin from "../i18n/es/admin.json";
import esAuth from "../i18n/es/auth.json";
import esLegal from "../i18n/es/legal.json";

export const SUPPORTED_LANGUAGES = ["en", "es"] as const;
export type SupportedLanguage = typeof SUPPORTED_LANGUAGES[number];

export const DEFAULT_LANGUAGE: SupportedLanguage = "en";

export const LANGUAGE_NAMES: Record<SupportedLanguage, string> = {
  en: "English",
  es: "Español",
};

export const ROUTE_SEGMENTS = {
  about: { en: "about", es: "acerca-de" },
  contact: { en: "contact", es: "contacto" },
  privacyPolicy: { en: "privacy-policy", es: "politica-de-privacidad" },
  termsOfService: { en: "terms-of-service", es: "terminos-de-servicio" },
  cookiePolicy: { en: "cookie-policy", es: "politica-de-cookies" },
  dataDeletion: { en: "data-deletion", es: "eliminacion-de-datos" },
} as const;

export type RouteKey = keyof typeof ROUTE_SEGMENTS;

const TRANSLATIONS = {
  en: {
    common: enCommon,
    post: enPost,
    admin: enAdmin,
    auth: enAuth,
    legal: enLegal,
  },
  es: {
    common: esCommon,
    post: esPost,
    admin: esAdmin,
    auth: esAuth,
    legal: esLegal,
  },
} as const;

export type Namespace = keyof typeof TRANSLATIONS["en"];

function getNestedValue(object: Record<string, unknown>, key: string): string | undefined {
  return key.split(".").reduce<unknown>((acc, part) => {
    if (acc && typeof acc === "object" && part in acc) {
      return (acc as Record<string, unknown>)[part];
    }
    return undefined;
  }, object) as string | undefined;
}

export function t(
  language: SupportedLanguage,
  key: string,
  namespace: Namespace = "common",
  variables: Record<string, string | number> = {},
): string {
  const dictionary = TRANSLATIONS[language]?.[namespace] ?? TRANSLATIONS[DEFAULT_LANGUAGE][namespace];
  const raw = getNestedValue(dictionary as Record<string, unknown>, key) ?? key;

  return Object.entries(variables).reduce((text, [varKey, value]) => {
    return text.replace(new RegExp(`{{\\s*${varKey}\\s*}}`, "g"), String(value));
  }, raw);
}

export function detectLanguage(
  cookies: AstroCookies,
  acceptLanguageHeader?: string | null,
): SupportedLanguage {
  const cookieLang = cookies.get("preferred_language")?.value;
  if (cookieLang && isSupportedLanguage(cookieLang)) {
    return cookieLang;
  }

  if (acceptLanguageHeader) {
    const browserLang = parseBrowserLanguage(acceptLanguageHeader);
    if (browserLang) {
      return browserLang;
    }
  }

  return DEFAULT_LANGUAGE;
}

function parseBrowserLanguage(header: string): SupportedLanguage | null {
  const languages = header
    .split(",")
    .map((lang) => {
      const [code, qStr] = lang.trim().split(";");
      const q = qStr ? parseFloat(qStr.split("=")[1]) : 1;
      return { code: code.split("-")[0].toLowerCase(), q };
    })
    .sort((a, b) => b.q - a.q);

  for (const { code } of languages) {
    if (isSupportedLanguage(code)) {
      return code;
    }
  }

  return null;
}

export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

export function setLanguagePreference(cookies: AstroCookies, language: SupportedLanguage) {
  cookies.set("preferred_language", language, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: true,
    httpOnly: false,
  });
}

export function getLocalizedPath(path: string, language: SupportedLanguage): string {
  const cleanPath = path.replace(/^\/(en|es)(\/|$)/, "/");
  const normalized = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  const parts = normalized.split("/").filter(Boolean);
  const [first, ...rest] = parts;

  if (!first) {
    return `/${language}/`;
  }

  const translatedRoute = translateRouteSegment(first, language);
  const next = translatedRoute ? [translatedRoute, ...rest] : [first, ...rest];
  return `/${language}/${next.join("/")}`.replace(/\/$/, "/");
}

export function getLanguageFromPath(pathname: string): SupportedLanguage {
  const match = pathname.match(/^\/(en|es)(\/|$)/);
  if (match && isSupportedLanguage(match[1])) {
    return match[1];
  }
  return DEFAULT_LANGUAGE;
}

export function getRouteSegment(language: SupportedLanguage, key: RouteKey): string {
  return ROUTE_SEGMENTS[key][language];
}

export function getRoutePath(language: SupportedLanguage, key: RouteKey): string {
  return `/${language}/${getRouteSegment(language, key)}`;
}

function translateRouteSegment(segment: string, language: SupportedLanguage): string | null {
  const entries = Object.values(ROUTE_SEGMENTS);
  for (const mapping of entries) {
    if (Object.values(mapping).includes(segment as never)) {
      return mapping[language];
    }
  }
  return null;
}

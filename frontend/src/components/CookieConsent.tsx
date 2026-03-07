import { useEffect, useState } from "preact/hooks";
import { getApiUrl } from "../lib/env";
import { supabase } from "../lib/supabase";
import { DEFAULT_LANGUAGE, getLanguageFromPath, getRoutePath, isSupportedLanguage, t, type SupportedLanguage } from "../lib/i18n";

interface CookiePreferences {
  functional: boolean;
  analytics: boolean;
  marketing: boolean;
  version: string;
}

const CONSENT_VERSION = "1";
const STORAGE_KEY = "cookie_consent";
const VERSION_KEY = "cookie_consent_version";
const DATE_KEY = "cookie_consent_date";
const SESSION_KEY = "cookie_session_id";
const API_URL = getApiUrl();

interface Props {
  language?: SupportedLanguage;
}

function safeParse(value: string | null): CookiePreferences | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as CookiePreferences;
  } catch (_error) {
    return null;
  }
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sessionId = window.localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID();
    window.localStorage.setItem(SESSION_KEY, sessionId);
  }
  return sessionId;
}

function applyConsent(preferences: CookiePreferences) {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: (..._args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") return;

  gtag("consent", "update", {
    analytics_storage: preferences.analytics ? "granted" : "denied",
    ad_storage: preferences.marketing ? "granted" : "denied",
  });
}

function getCookieLanguage(): SupportedLanguage | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|; )preferred_language=([^;]+)/);
  if (!match) return null;
  const value = decodeURIComponent(match[1] || "").trim();
  return isSupportedLanguage(value) ? value : null;
}

function resolveLanguage(provided?: SupportedLanguage): SupportedLanguage {
  if (provided && isSupportedLanguage(provided)) return provided;
  const cookieLang = getCookieLanguage();
  if (cookieLang) return cookieLang;
  if (typeof window !== "undefined") {
    const pathLang = getLanguageFromPath(window.location.pathname);
    if (isSupportedLanguage(pathLang)) return pathLang;
  }
  return DEFAULT_LANGUAGE;
}

export default function CookieConsent({ language }: Props) {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
    language && isSupportedLanguage(language) ? language : DEFAULT_LANGUAGE,
  );
  const [preferences, setPreferences] = useState<CookiePreferences>({
    functional: true,
    analytics: false,
    marketing: false,
    version: CONSENT_VERSION,
  });

  useEffect(() => {
    setCurrentLanguage(resolveLanguage(language));
  }, [language]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const stored = safeParse(window.localStorage.getItem(STORAGE_KEY));
    const storedVersion = window.localStorage.getItem(VERSION_KEY);

    if (!stored || storedVersion !== CONSENT_VERSION) {
      applyConsent({
        functional: true,
        analytics: false,
        marketing: false,
        version: CONSENT_VERSION,
      });
      setShowBanner(true);
      return;
    }

    setPreferences(stored);
    applyConsent(stored);
  }, []);

  const persistConsent = async (prefs: CookiePreferences) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      window.localStorage.setItem(VERSION_KEY, CONSENT_VERSION);
      window.localStorage.setItem(DATE_KEY, new Date().toISOString());
    }

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      await fetch(`${API_URL}/api/cookies/consent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          analytics_cookies: prefs.analytics,
          marketing_cookies: prefs.marketing,
          functional_cookies: true,
          session_id: getSessionId(),
        }),
      });
    } catch (_error) {
      // Non-blocking
    }

    applyConsent(prefs);
  };

  const acceptAll = () => {
    const next = {
      functional: true,
      analytics: true,
      marketing: true,
      version: CONSENT_VERSION,
    };
    setPreferences(next);
    persistConsent(next);
    setShowBanner(false);
    setShowSettings(false);
  };

  const acceptNecessary = () => {
    const next = {
      functional: true,
      analytics: false,
      marketing: false,
      version: CONSENT_VERSION,
    };
    setPreferences(next);
    persistConsent(next);
    setShowBanner(false);
    setShowSettings(false);
  };

  const savePreferences = () => {
    const next = { ...preferences, functional: true, version: CONSENT_VERSION };
    setPreferences(next);
    persistConsent(next);
    setShowBanner(false);
    setShowSettings(false);
  };

  if (!showBanner) return null;
  const policyHref = getRoutePath(currentLanguage, "cookiePolicy");

  return (
    <div class="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-text-primary)] text-white shadow-lg">
      <div class="container-responsive py-4">
        {!showSettings ? (
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div class="space-y-2">
              <p class="text-sm font-semibold">{t(currentLanguage, "cookieConsent.bannerTitle")}</p>
              <p class="text-xs text-gray-200 max-w-2xl">
                {t(currentLanguage, "cookieConsent.bannerDescription")}
                <a
                  href={policyHref}
                  class="underline ml-1 text-white"
                >
                  {t(currentLanguage, "cookieConsent.policyLink")}
                </a>
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
                onClick={() => setShowSettings(true)}
              >
                {t(currentLanguage, "cookieConsent.configure")}
              </button>
              <button
                type="button"
                class="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
                onClick={acceptNecessary}
              >
                {t(currentLanguage, "cookieConsent.acceptNecessary")}
              </button>
              <button
                type="button"
                class="px-4 py-2 rounded-lg bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-hover)] text-xs font-semibold"
                onClick={acceptAll}
              >
                {t(currentLanguage, "cookieConsent.acceptAll")}
              </button>
            </div>
          </div>
        ) : (
          <div class="space-y-4">
            <div>
              <p class="text-sm font-semibold">{t(currentLanguage, "cookieConsent.settingsTitle")}</p>
              <p class="text-xs text-gray-200">
                {t(currentLanguage, "cookieConsent.settingsDescription")}
              </p>
            </div>

            <div class="space-y-3">
              <div class="flex items-center justify-between gap-4 bg-white/5 rounded-lg px-4 py-3">
                <div>
                  <p class="text-sm font-semibold">
                    {t(currentLanguage, "cookieConsent.categories.functional")}
                  </p>
                  <p class="text-xs text-gray-300">
                    {t(currentLanguage, "cookieConsent.categories.functionalDescription")}
                  </p>
                </div>
                <span class="text-xs text-green-200">
                  {t(currentLanguage, "cookieConsent.alwaysActive")}
                </span>
              </div>

              <div class="flex items-center justify-between gap-4 bg-white/5 rounded-lg px-4 py-3">
                <div>
                  <p class="text-sm font-semibold">
                    {t(currentLanguage, "cookieConsent.categories.analytics")}
                  </p>
                  <p class="text-xs text-gray-300">
                    {t(currentLanguage, "cookieConsent.categories.analyticsDescription")}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.analytics}
                  onChange={(event) =>
                    setPreferences({
                      ...preferences,
                      analytics: (event.currentTarget as HTMLInputElement).checked,
                    })}
                />
              </div>

              <div class="flex items-center justify-between gap-4 bg-white/5 rounded-lg px-4 py-3">
                <div>
                  <p class="text-sm font-semibold">
                    {t(currentLanguage, "cookieConsent.categories.marketing")}
                  </p>
                  <p class="text-xs text-gray-300">
                    {t(currentLanguage, "cookieConsent.categories.marketingDescription")}
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.marketing}
                  onChange={(event) =>
                    setPreferences({
                      ...preferences,
                      marketing: (event.currentTarget as HTMLInputElement).checked,
                    })}
                />
              </div>
            </div>

            <div class="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                class="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
                onClick={() => setShowSettings(false)}
              >
                {t(currentLanguage, "cookieConsent.cancel")}
              </button>
              <button
                type="button"
                class="px-4 py-2 rounded-lg bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-hover)] text-xs font-semibold"
                onClick={savePreferences}
              >
                {t(currentLanguage, "cookieConsent.save")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

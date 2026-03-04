import { useEffect, useState } from "preact/hooks";
import { getApiUrl } from "../lib/env";
import { supabase } from "../lib/supabase";

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
  const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof gtag !== "function") return;

  gtag("consent", "update", {
    analytics_storage: preferences.analytics ? "granted" : "denied",
    ad_storage: preferences.marketing ? "granted" : "denied",
  });
}

export default function CookieConsent() {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    functional: true,
    analytics: false,
    marketing: false,
    version: CONSENT_VERSION,
  });

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

  return (
    <div class="fixed bottom-0 left-0 right-0 z-50 bg-[var(--color-text-primary)] text-white shadow-lg">
      <div class="container-responsive py-4">
        {!showSettings ? (
          <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div class="space-y-2">
              <p class="text-sm font-semibold">Cookies y privacidad</p>
              <p class="text-xs text-gray-200 max-w-2xl">
                Usamos cookies esenciales para el funcionamiento del sitio y cookies opcionales
                para analítica. Usted puede aceptar todas o configurar sus preferencias.
                <a
                  href="/cookie-policy"
                  class="underline ml-1 text-white"
                >
                  Ver política de cookies
                </a>
              </p>
            </div>
            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
                onClick={() => setShowSettings(true)}
              >
                Configurar
              </button>
              <button
                type="button"
                class="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold"
                onClick={acceptNecessary}
              >
                Solo necesarias
              </button>
              <button
                type="button"
                class="px-4 py-2 rounded-lg bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-hover)] text-xs font-semibold"
                onClick={acceptAll}
              >
                Aceptar todas
              </button>
            </div>
          </div>
        ) : (
          <div class="space-y-4">
            <div>
              <p class="text-sm font-semibold">Preferencias de cookies</p>
              <p class="text-xs text-gray-200">
                Las cookies funcionales son necesarias y siempre están activas.
              </p>
            </div>

            <div class="space-y-3">
              <div class="flex items-center justify-between gap-4 bg-white/5 rounded-lg px-4 py-3">
                <div>
                  <p class="text-sm font-semibold">Funcionales</p>
                  <p class="text-xs text-gray-300">Autenticación y sesión</p>
                </div>
                <span class="text-xs text-green-200">Siempre activas</span>
              </div>

              <div class="flex items-center justify-between gap-4 bg-white/5 rounded-lg px-4 py-3">
                <div>
                  <p class="text-sm font-semibold">Analíticas</p>
                  <p class="text-xs text-gray-300">Métricas agregadas de uso</p>
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
                  <p class="text-sm font-semibold">Marketing</p>
                  <p class="text-xs text-gray-300">No usamos actualmente</p>
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
                Volver
              </button>
              <button
                type="button"
                class="px-4 py-2 rounded-lg bg-[var(--color-accent-primary)] hover:bg-[var(--color-accent-hover)] text-xs font-semibold"
                onClick={savePreferences}
              >
                Guardar preferencias
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { getApiUrl } from "./env";
import { getLanguageFromPath, isSupportedLanguage, t } from "./i18n";

type Json =
  Record<string, unknown> | unknown[] | string | number | boolean | null;

type BackendStatusEvent = "success" | "failure";

type BackendStatusListener = (_event: BackendStatusEvent) => void;

const BACKEND_URL = import.meta.env.PUBLIC_API_URL || getApiUrl();

// Share pending GETs; request-specific auth and abort options bypass sharing.
const inFlightRequests = new Map<string, Promise<Response>>();

class ServiceUnavailableError extends Error {
  constructor() {
    const documentLanguage =
      typeof document === "undefined"
        ? ""
        : document.documentElement.lang.toLowerCase();
    const language = isSupportedLanguage(documentLanguage)
      ? documentLanguage
      : typeof window === "undefined"
      ? "en"
      : getLanguageFromPath(window.location.pathname);
    super(t(language, "maintenance.featureUnavailable", "common"));
    this.name = "ServiceUnavailableError";
  }
}

export function isBackendCall(url: string): boolean {
  const target = String(url ?? "");
  const backendUrl = BACKEND_URL.replace(/\/+$/, "");
  return (
    target.startsWith("/api/") ||
    (backendUrl !== "" &&
      (target === backendUrl || target.startsWith(`${backendUrl}/`)))
  );
}

export const backendStatusBus = {
  listeners: new Set<BackendStatusListener>(),
  emit(event: BackendStatusEvent) {
    for (const listener of this.listeners) {
      listener(event);
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("cwb:backend-status", { detail: { type: event } }),
      );
    }
  },
  subscribe(listener: BackendStatusListener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },
};

export async function apiCall(
  url: string,
  options: RequestInit = {},
): Promise<Response> {
  const isGet = (options.method ?? "GET").toUpperCase() === "GET";
  const headers = new Headers(options.headers);
  const canDeduplicate = isGet &&
    options.body == null &&
    options.signal == null &&
    !headers.has("Authorization");

  if (canDeduplicate) {
    const inFlightRequest = inFlightRequests.get(url);
    if (inFlightRequest) {
      return inFlightRequest.then((response) => response.clone());
    }
  }

  const fetchPromise = (async () => {
    try {
      const response = await fetch(url, options);

      if (response.status === 503 || response.status === 502) {
        backendStatusBus.emit("failure");
        throw new ServiceUnavailableError();
      }

      if (isBackendCall(url)) {
        backendStatusBus.emit("success");
      }

      return response;
    } catch (error) {
      if (error instanceof ServiceUnavailableError) {
        throw error;
      }

      if (error instanceof TypeError && isBackendCall(url)) {
        backendStatusBus.emit("failure");
        throw new ServiceUnavailableError();
      }

      throw error;
    }
  })();

  if (canDeduplicate) {
    inFlightRequests.set(url, fetchPromise);
    const clearInFlightRequest = () => {
      if (inFlightRequests.get(url) === fetchPromise) {
        inFlightRequests.delete(url);
      }
    };
    void fetchPromise.then(clearInFlightRequest, clearInFlightRequest);
    return fetchPromise.then((response) => response.clone());
  }

  return fetchPromise;
}

function joinUrl(base: string, path: string) {
  const b = String(base ?? "").replace(/\/$/, "");
  const p = String(path ?? "");
  if (!p) return b;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  if (p.startsWith("/")) return `${b}${p}`;
  return `${b}/${p}`;
}

export async function apiFetch<T = Json>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const url = joinUrl(getApiUrl(), path);

  const headers = new Headers(options.headers ?? {});
  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");

  const res = await apiCall(url, {
    credentials: "include",
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`.trim();
    try {
      const body = await res.json();
      message = String(
        (body as any)?.message || (body as any)?.error || message,
      );
    } catch (_err) {
      // ignore
    }
    throw new Error(message);
  }

  // Some endpoints may return empty bodies.
  const text = await res.text();
  if (!text) return undefined as T;
  try {
    return JSON.parse(text) as T;
  } catch (_err) {
    return text as unknown as T;
  }
}

function withQuery(
  path: string,
  query: Record<string, string | number | boolean | undefined | null>,
) {
  const url = new URL(path, "http://local");
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined || v === null || v === "") continue;
    url.searchParams.set(k, String(v));
  }
  const qs = url.searchParams.toString();
  return qs ? `${url.pathname}?${qs}` : url.pathname;
}

export const pollsApi = {
  get(slug: string, lang: string) {
    return apiFetch(
      `/api/polls/${encodeURIComponent(slug)}?lang=${encodeURIComponent(lang)}`,
    );
  },
  myVote(slug: string, lang: string) {
    return apiFetch(
      `/api/polls/${encodeURIComponent(slug)}/my-vote?lang=${encodeURIComponent(lang)}`,
    );
  },
  vote(slug: string, lang: string, data: unknown) {
    return apiFetch(
      `/api/polls/${encodeURIComponent(slug)}/vote?lang=${encodeURIComponent(lang)}`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },
  removeVote(slug: string, lang: string) {
    return apiFetch(
      `/api/polls/${encodeURIComponent(slug)}/remove-vote?lang=${encodeURIComponent(lang)}`,
      {
        method: "DELETE",
      },
    );
  },
  results(slug: string, lang: string) {
    return apiFetch(
      `/api/polls/${encodeURIComponent(slug)}/results?lang=${encodeURIComponent(lang)}`,
    );
  },
  analytics(slug: string, lang: string) {
    return apiFetch(
      `/api/polls/${encodeURIComponent(slug)}/analytics?lang=${encodeURIComponent(lang)}`,
    );
  },
  list(params: { language?: string; status?: string; limit?: number }) {
    // Backend list endpoint uses `language` query param (not `lang`).
    const path = withQuery("/api/polls", params);
    return apiFetch(path);
  },
  create(data: unknown) {
    return apiFetch("/api/polls/create", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update(slug: string, lang: string, data: unknown) {
    return apiFetch(
      `/api/polls/${encodeURIComponent(slug)}/update?lang=${encodeURIComponent(lang)}`,
      {
        method: "PUT",
        body: JSON.stringify(data),
      },
    );
  },
  delete(slug: string, lang: string) {
    return apiFetch(
      `/api/polls/${encodeURIComponent(slug)}/delete?lang=${encodeURIComponent(lang)}`,
      {
        method: "DELETE",
      },
    );
  },
  addOption(slug: string, lang: string, data: unknown) {
    return apiFetch(
      `/api/polls/${encodeURIComponent(slug)}/options/create?lang=${encodeURIComponent(lang)}`,
      {
        method: "POST",
        body: JSON.stringify(data),
      },
    );
  },
  deleteOption(slug: string, lang: string, optionId: string) {
    return apiFetch(
      `/api/polls/${encodeURIComponent(slug)}/options/${encodeURIComponent(optionId)}/delete?lang=${encodeURIComponent(lang)}`,
      { method: "DELETE" },
    );
  },
  translations(slug: string, lang: string) {
    return apiFetch(
      `/api/polls/${encodeURIComponent(slug)}/translations?lang=${encodeURIComponent(lang)}`,
    );
  },
  linkTranslation(
    slug: string,
    lang: string,
    linkedSlug: string,
    linkedLanguage: string,
  ) {
    return apiFetch(
      `/api/polls/${encodeURIComponent(slug)}/translations?lang=${encodeURIComponent(lang)}`,
      {
        method: "POST",
        body: JSON.stringify({ linkedSlug, linkedLanguage }),
      },
    );
  },
  unlinkTranslation(slug: string, lang: string) {
    return apiFetch(
      `/api/polls/${encodeURIComponent(slug)}/unlink?lang=${encodeURIComponent(lang)}`,
      {
        method: "POST",
      },
    );
  },
};

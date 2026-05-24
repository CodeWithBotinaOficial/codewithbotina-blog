import { getApiUrl } from "./env";

type Json = Record<string, unknown> | unknown[] | string | number | boolean | null;

function joinUrl(base: string, path: string) {
  const b = String(base ?? "").replace(/\/$/, "");
  const p = String(path ?? "");
  if (!p) return b;
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  if (p.startsWith("/")) return `${b}${p}`;
  return `${b}/${p}`;
}

export async function apiFetch<T = Json>(path: string, options: RequestInit = {}): Promise<T> {
  const url = joinUrl(getApiUrl(), path);

  const headers = new Headers(options.headers ?? {});
  const hasBody = options.body !== undefined && options.body !== null;
  if (hasBody && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");

  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });

  if (!res.ok) {
    let message = `${res.status} ${res.statusText}`.trim();
    try {
      const body = await res.json();
      message = String((body as any)?.message || (body as any)?.error || message);
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

function withQuery(path: string, query: Record<string, string | number | boolean | undefined | null>) {
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
    return apiFetch(`/api/polls/${encodeURIComponent(slug)}?lang=${encodeURIComponent(lang)}`);
  },
  myVote(slug: string, lang: string) {
    return apiFetch(`/api/polls/${encodeURIComponent(slug)}/my-vote?lang=${encodeURIComponent(lang)}`);
  },
  vote(slug: string, lang: string, data: unknown) {
    return apiFetch(`/api/polls/${encodeURIComponent(slug)}/vote?lang=${encodeURIComponent(lang)}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  removeVote(slug: string, lang: string) {
    return apiFetch(`/api/polls/${encodeURIComponent(slug)}/remove-vote?lang=${encodeURIComponent(lang)}`, {
      method: "DELETE",
    });
  },
  results(slug: string, lang: string) {
    return apiFetch(`/api/polls/${encodeURIComponent(slug)}/results?lang=${encodeURIComponent(lang)}`);
  },
  analytics(slug: string, lang: string) {
    return apiFetch(`/api/polls/${encodeURIComponent(slug)}/analytics?lang=${encodeURIComponent(lang)}`);
  },
  list(params: { language?: string; status?: string; limit?: number }) {
    // Backend list endpoint uses `language` query param (not `lang`).
    const path = withQuery("/api/polls", params);
    return apiFetch(path);
  },
  create(data: unknown) {
    return apiFetch("/api/polls/create", { method: "POST", body: JSON.stringify(data) });
  },
  update(slug: string, lang: string, data: unknown) {
    return apiFetch(`/api/polls/${encodeURIComponent(slug)}/update?lang=${encodeURIComponent(lang)}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  delete(slug: string, lang: string) {
    return apiFetch(`/api/polls/${encodeURIComponent(slug)}/delete?lang=${encodeURIComponent(lang)}`, {
      method: "DELETE",
    });
  },
  addOption(slug: string, lang: string, data: unknown) {
    return apiFetch(`/api/polls/${encodeURIComponent(slug)}/options/create?lang=${encodeURIComponent(lang)}`, {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  deleteOption(slug: string, lang: string, optionId: string) {
    return apiFetch(
      `/api/polls/${encodeURIComponent(slug)}/options/${encodeURIComponent(optionId)}/delete?lang=${encodeURIComponent(lang)}`,
      { method: "DELETE" },
    );
  },
};


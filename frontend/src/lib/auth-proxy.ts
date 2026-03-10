import { getApiUrl } from "./env";

const HOP_BY_HOP_HEADERS = new Set([
  "access-control-allow-credentials",
  "access-control-allow-headers",
  "access-control-allow-methods",
  "access-control-allow-origin",
  "connection",
  "content-length",
  "keep-alive",
  "transfer-encoding",
]);

function getUpstreamHeaders(source: Headers): Headers {
  const headers = new Headers();

  source.forEach((value, key) => {
    const normalized = key.toLowerCase();
    if (normalized === "host" || normalized === "origin" || normalized === "referer") {
      return;
    }
    headers.set(key, value);
  });

  return headers;
}

function splitSetCookieHeader(value: string): string[] {
  const cookies: string[] = [];
  let current = "";
  let inExpires = false;

  for (const char of value) {
    current += char;

    if (current.toLowerCase().endsWith("expires=")) {
      inExpires = true;
      continue;
    }

    if (inExpires && char === ";") {
      inExpires = false;
      continue;
    }

    if (!inExpires && char === ",") {
      cookies.push(current.slice(0, -1).trim());
      current = "";
    }
  }

  const trailing = current.trim();
  if (trailing) {
    cookies.push(trailing);
  }

  return cookies;
}

function getSetCookieHeaders(headers: Headers): string[] {
  const withGetSetCookie = headers as Headers & {
    getSetCookie?: () => string[];
    getAll?: (_name: string) => string[];
  };

  if (typeof withGetSetCookie.getSetCookie === "function") {
    return withGetSetCookie.getSetCookie();
  }

  if (typeof withGetSetCookie.getAll === "function") {
    return withGetSetCookie.getAll("set-cookie");
  }

  const rawValue = headers.get("set-cookie");
  if (!rawValue) return [];
  return splitSetCookieHeader(rawValue);
}

function getUpstreamUrl(request: Request, path: string): URL {
  const upstream = new URL(
    `${getApiUrl().replace(/\/$/, "")}/api/auth/${path}`,
  );
  upstream.search = new URL(request.url).search;
  return upstream;
}

export async function proxyAuthRequest(request: Request, path: string): Promise<Response> {
  const upstreamResponse = await fetch(getUpstreamUrl(request, path), {
    method: request.method,
    headers: getUpstreamHeaders(request.headers),
    body: request.method === "GET" || request.method === "HEAD"
      ? undefined
      : await request.arrayBuffer(),
    redirect: "manual",
  });

  const headers = new Headers();

  upstreamResponse.headers.forEach((value, key) => {
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase()) || key.toLowerCase() === "set-cookie") {
      return;
    }
    headers.set(key, value);
  });

  for (const cookie of getSetCookieHeaders(upstreamResponse.headers)) {
    headers.append("Set-Cookie", cookie);
  }

  headers.set("Cache-Control", "no-store");

  return new Response(
    upstreamResponse.status === 204 || upstreamResponse.status === 304
      ? null
      : await upstreamResponse.arrayBuffer(),
    {
      status: upstreamResponse.status,
      headers,
    },
  );
}

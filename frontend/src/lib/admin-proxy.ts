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
    if (
      normalized === "host" || normalized === "origin" ||
      normalized === "referer"
    ) {
      return;
    }
    headers.set(key, value);
  });

  return headers;
}

function getUpstreamUrl(request: Request, path: string): URL {
  const safePath = String(path ?? "").replace(/^\/+/, "");
  const upstream = new URL(`${getApiUrl().replace(/\/$/, "")}/api/${safePath}`);
  upstream.search = new URL(request.url).search;
  return upstream;
}

export async function proxyAdminRequest(
  request: Request,
  path: string,
): Promise<Response> {
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
    if (HOP_BY_HOP_HEADERS.has(key.toLowerCase())) return;
    headers.set(key, value);
  });

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


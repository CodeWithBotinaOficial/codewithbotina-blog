import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiCall, backendStatusBus, isBackendCall } from "../../../src/lib/api";
import { t } from "../../../src/lib/i18n";

describe("apiCall backend status detection", () => {
  let events: string[];
  let unsubscribe: () => void;

  beforeEach(() => {
    events = [];
    unsubscribe = backendStatusBus.subscribe((event) => events.push(event));
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    unsubscribe();
    vi.unstubAllGlobals();
  });

  it.each([502, 503])("reports HTTP %s as a backend failure", async (status) => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status }));

    await expect(apiCall("/api/posts")).rejects.toThrow(
      t("es", "maintenance.featureUnavailable"),
    );
    expect(events).toEqual(["failure"]);
  });

  it("reports network and CORS-style failures for backend calls", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiCall("/api/posts")).rejects.toThrow(
      t("es", "maintenance.featureUnavailable"),
    );
    expect(events).toEqual(["failure"]);
  });

  it.each([200, 400])("reports HTTP %s as a backend response", async (status) => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status }));

    await apiCall("/api/posts");
    expect(events).toEqual(["success"]);
  });

  it("does not report failures for third-party endpoints", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(apiCall("https://third-party.example/data")).rejects.toThrow(
      "Failed to fetch",
    );
    expect(events).toEqual([]);
    expect(isBackendCall("https://api.codewithbotina.com.evil.example/api")).toBe(
      false,
    );
  });
});

describe("apiCall in-flight request deduplication", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shares concurrent GET requests and gives each caller a readable response", async () => {
    let resolveFetch!: (_response: Response) => void;
    vi.mocked(fetch).mockImplementation(
      (_input, _init) =>
        new Promise((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const requests = [
      apiCall("https://api.example.com/api/tags"),
      apiCall("https://api.example.com/api/tags"),
      apiCall("https://api.example.com/api/tags"),
    ];

    expect(fetch).toHaveBeenCalledTimes(1);
    resolveFetch(new Response(JSON.stringify({ ok: true }), { status: 200 }));
    const responses = await Promise.all(requests);

    expect(await Promise.all(responses.map((response) => response.json())))
      .toEqual(
        [{ ok: true }, { ok: true }, { ok: true }],
      );
  });

  it("does not deduplicate POST requests", async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    await Promise.all([
      apiCall("https://api.example.com/api/reactions/1/like", {
        method: "POST",
      }),
      apiCall("https://api.example.com/api/reactions/1/like", {
        method: "POST",
      }),
    ]);

    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("allows a new GET request after the previous request resolves", async () => {
    vi.mocked(fetch).mockImplementation(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    );

    await apiCall("https://api.example.com/api/tags");
    await apiCall("https://api.example.com/api/tags");

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

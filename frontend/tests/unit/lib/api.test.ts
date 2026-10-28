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

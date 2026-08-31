import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "preact";
import AdminPostsList from "../../../src/components/admin/AdminPostsList";
import MultiLanguagePostEditor from "../../../src/components/admin/MultiLanguagePostEditor";
import { utcToLocalInputValue, localDatetimeToUtcIso, utcIsoToLocalDatetime } from "../../../src/lib/scheduled-post-datetime";

vi.mock("../../../src/hooks/useSession", () => ({
  useSession: () => ({
    loading: false,
    isAuthenticated: true,
    isAdmin: true,
  }),
}));

describe("AdminPostsList countdown behavior", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("updates the scheduled countdown every second", async () => {
    const now = new Date("2026-08-29T12:00:00Z");
    vi.setSystemTime(now);

    const container = document.createElement("div");
    document.body.appendChild(container);

    render(
      <AdminPostsList
        posts={[
          {
            id: "post-1",
            titulo: "Release notes",
            slug: "release-notes",
            fecha: now.toISOString(),
            status: "scheduled",
            scheduled_at: new Date(now.getTime() + 30_000).toISOString(),
          },
        ]}
        currentLanguage="en"
      />,
      container,
    );

    expect(container.textContent).toContain("30s");

    await vi.advanceTimersByTimeAsync(1_000);

    expect(container.textContent).toContain("29s");
  });

  it("shows Publishing... after the scheduled time has arrived", async () => {
    const now = new Date("2026-08-29T12:00:00Z");
    vi.setSystemTime(now);

    const container = document.createElement("div");
    document.body.appendChild(container);

    render(
      <AdminPostsList
        posts={[
          {
            id: "post-2",
            titulo: "Release notes",
            slug: "release-notes",
            fecha: now.toISOString(),
            status: "scheduled",
            scheduled_at: new Date(now.getTime() - 1_000).toISOString(),
          },
        ]}
        currentLanguage="en"
      />,
      container,
    );

    expect(container.textContent).toContain("Publishing...");
  });
});

describe("timezone-aware formatting", () => {
  it("formats scheduled times using the current locale", () => {
    const utcDate = new Date("2026-08-30T18:30:00Z");

    const en = new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(utcDate);

    const es = new Intl.DateTimeFormat("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(utcDate);

    expect(en).toMatch(/2026|Aug|30/i);
    expect(es).toMatch(/2026|ago|30/i);
  });

  it("converts UTC ISO strings to the local datetime-local format without timezone or seconds", () => {
    const iso = "2026-09-01T13:00:00+00:00";
    const value = utcToLocalInputValue(iso);
    const parsedLocal = new Date(iso);
    const expected = [
      parsedLocal.getFullYear(),
      String(parsedLocal.getMonth() + 1).padStart(2, "0"),
      String(parsedLocal.getDate()).padStart(2, "0"),
    ].join("-") + `T${String(parsedLocal.getHours()).padStart(2, "0")}:${String(parsedLocal.getMinutes()).padStart(2, "0")}`;

    expect(value).toBe(expected);
    expect(value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/);
    expect(value).not.toContain("+");
    expect(value).not.toContain("Z");
    expect(localDatetimeToUtcIso(value)).toBe(new Date(iso).toISOString());
  });

  it("uses the local datetime value when hydrating the scheduled input", () => {
    const iso = "2026-09-01T13:00:00+00:00";
    const container = document.createElement("div");
    document.body.appendChild(container);

    render(
      <MultiLanguagePostEditor
        mode="edit"
        uiLanguage="en"
        initialData={{
          id: "post-3",
          language: "en",
          titulo: "Test title",
          slug: "test-title",
          body: "This is enough content for the post body.",
          scheduled_at: iso,
        }}
      />,
      container,
    );

    const input = container.querySelector("#scheduled-post-datetime") as HTMLInputElement | null;
    expect(input).not.toBeNull();
    expect(input?.value).toBe(utcIsoToLocalDatetime(iso));
    expect(input?.value).not.toContain("+");
    expect(input?.value).not.toContain("Z");
  });
});

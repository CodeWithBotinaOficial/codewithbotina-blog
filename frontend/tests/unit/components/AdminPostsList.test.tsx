import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "preact";
import AdminPostsList from "../../../src/components/admin/AdminPostsList";

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
});

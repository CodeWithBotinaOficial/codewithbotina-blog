import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "preact";
import TranslationLinker from "../../../src/components/admin/TranslationLinker";

describe("TranslationLinker", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.useFakeTimers();
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("filters out same-language posts and enforces one-per-language", async () => {
    const onChangeSpy = vi.fn();
    let selected: any[] = [];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ "content-type": "application/json" }),
      json: async () => ({
        data: {
          posts: [
            {
              id: "en-1",
              titulo: "English Post",
              slug: "english-post",
              language: "en",
              fecha: "2026-01-01T00:00:00Z",
            },
            {
              id: "es-1",
              titulo: "Post en Español",
              slug: "post-es",
              language: "es",
              fecha: "2026-01-02T00:00:00Z",
            },
            {
              id: "es-2",
              titulo: "Otro Post en Español",
              slug: "otro-post-es",
              language: "es",
              fecha: "2026-01-03T00:00:00Z",
            },
            {
              id: "fr-1",
              titulo: "Post Français",
              slug: "post-fr",
              language: "fr",
              fecha: "2026-01-04T00:00:00Z",
            },
          ],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const renderLinker = () =>
      render(
        <TranslationLinker
          currentPostId="current"
          currentPostLanguage="en"
          selected={selected}
          onChange={(next) => {
            selected = next as any[];
            onChangeSpy(next);
            renderLinker();
          }}
          labels={{
            title: "Translations",
            empty: "None",
            searchPlaceholder: "Search posts...",
            searching: "Searching...",
            noResults: "No results",
            removeLabel: "Remove",
            languageLabel: "Lang",
            dateLabel: "Date",
          }}
        />,
        container,
      );

    renderLinker();

    const input = container.querySelector("input") as HTMLInputElement;
    input.value = "po";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    await vi.runAllTimersAsync();
    await Promise.resolve();

    // English result should be filtered out.
    expect(container.textContent).not.toContain("English Post");
    expect(container.textContent).toContain("Post en Español");

    // Select Spanish post.
    const spanishButton = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Post en Español")
    );
    spanishButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onChangeSpy).toHaveBeenCalledTimes(1);
    expect((onChangeSpy.mock.calls[0][0] as any[])[0].language).toBe("es");

    // Re-type to open results again; other Spanish posts should be disabled.
    input.value = "po";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    await vi.runAllTimersAsync();
    await Promise.resolve();

    const otherSpanish = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Otro Post en Español")
    ) as HTMLButtonElement | undefined;
    expect(otherSpanish).toBeTruthy();
    expect(otherSpanish?.disabled).toBe(true);
  });
});

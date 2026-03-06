import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "preact";
import TagSelector from "../../../src/components/admin/TagSelector";

describe("TagSelector", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("renders label and placeholder from labels", () => {
    render(
      <TagSelector
        title="Title"
        body="Body"
        selectedTags={[]}
        onChange={() => {}}
        labels={{
          title: "Custom Tags",
          emptyHint: "Add tags",
          inputPlaceholder: "Search tags",
          noResults: "No tags",
          createLabel: "Create {{tag}}",
          suggestionsTitle: "Suggestions",
          loadingSuggestions: "Loading",
          suggestionsError: "Error",
          postsCount: "{{count}} posts",
          removeLabel: "Remove {{tag}}",
        }}
      />,
      container,
    );

    const label = container.querySelector("label");
    const input = container.querySelector("input");
    expect(label?.textContent).toBe("Custom Tags");
    expect(input?.getAttribute("placeholder")).toBe("Search tags");
  });

  it("fetches autocomplete results and adds a tag", async () => {
    vi.useFakeTimers();
    const onChange = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        tags: [{ id: "tag-1", name: "React", slug: "react", usage_count: 3 }],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(
      <TagSelector
        title="Short"
        body="Short"
        selectedTags={[]}
        onChange={onChange}
      />,
      container,
    );

    const input = container.querySelector("input") as HTMLInputElement;
    input.value = "re";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    await vi.runAllTimersAsync();

    const reactButton = Array.from(container.querySelectorAll("button")).find((button) =>
      button.textContent?.includes("React")
    );
    expect(reactButton).toBeTruthy();
    reactButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange.mock.calls[0][0][0].name).toBe("React");
  });
});

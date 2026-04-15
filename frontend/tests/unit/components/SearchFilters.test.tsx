import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "preact";
import SearchFilters from "../../../src/components/search/SearchFilters";
import { DEFAULT_SEARCH_FILTERS } from "../../../src/types/search";

describe("SearchFilters", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it("prevents applying an invalid date range (to < from)", async () => {
    const onSearch = vi.fn();
    render(
      <SearchFilters
        onSearch={onSearch}
        initialFilters={DEFAULT_SEARCH_FILTERS("en")}
        compact={false}
        showTagFilter={false}
        autoApplySearch={false}
      />,
      container,
    );

    const inputs = Array.from(container.querySelectorAll("input[type=\"date\"]")) as HTMLInputElement[];
    expect(inputs.length).toBeGreaterThanOrEqual(2);

    const [from, to] = inputs;
    from.value = "2026-03-10";
    from.dispatchEvent(new Event("change", { bubbles: true }));
    to.value = "2026-03-01";
    to.dispatchEvent(new Event("change", { bubbles: true }));

    await new Promise((r) => setTimeout(r, 0));

    const apply = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Apply")
    ) as HTMLButtonElement;
    apply.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onSearch).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 0));
    expect(container.textContent).toContain("Invalid date range");
  });

  it("rejects future dates", async () => {
    const onSearch = vi.fn();
    render(
      <SearchFilters
        onSearch={onSearch}
        initialFilters={DEFAULT_SEARCH_FILTERS("en")}
        compact={false}
        showTagFilter={false}
        autoApplySearch={false}
      />,
      container,
    );

    const inputs = Array.from(container.querySelectorAll("input[type=\"date\"]")) as HTMLInputElement[];
    const [from] = inputs;
    from.value = "2999-01-01";
    from.dispatchEvent(new Event("change", { bubbles: true }));

    await new Promise((r) => setTimeout(r, 0));

    const apply = Array.from(container.querySelectorAll("button")).find((b) =>
      b.textContent?.includes("Apply")
    ) as HTMLButtonElement;
    apply.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(onSearch).not.toHaveBeenCalled();
    await new Promise((r) => setTimeout(r, 0));
    expect(container.textContent).toContain("Future dates not allowed");
  });
});

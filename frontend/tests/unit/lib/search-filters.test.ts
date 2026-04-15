import { describe, it, expect } from "vitest";
import { filtersFromUrl, filtersToUrlParams } from "../../../src/lib/search-filters";

describe("search-filters URL helpers", () => {
  it("round-trips common filter params", () => {
    const params = new URLSearchParams();
    params.set("search", "hooks");
    params.set("from", "2026-02-01");
    params.set("to", "2026-03-06");
    params.set("relevance", "most_likes");
    params.set("sort", "newest");
    params.set("scope", "title_content");
    params.set("tags", "react,typescript");
    params.set("lang", "en,es");

    const filters = filtersFromUrl(params, "en");
    expect(filters.search).toBe("hooks");
    expect(filters.tags).toEqual(["react", "typescript"]);
    expect(filters.languageMode).toBe("selected");
    expect(filters.languages).toEqual(["en", "es"]);

    const out = filtersToUrlParams(filters);
    expect(out.get("search")).toBe("hooks");
    expect(out.get("from")).toBe("2026-02-01");
    expect(out.get("to")).toBe("2026-03-06");
    expect(out.get("relevance")).toBe("most_likes");
    expect(out.get("scope")).toBe("title_content");
    expect(out.get("tags")).toBe("react,typescript");
    expect(out.get("lang")).toBe("en,es");
  });
});


import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render } from "preact";
import GlobalSearchModal, { searchPosts } from "../../../src/components/search/GlobalSearchModal";
import { DEFAULT_SEARCH_FILTERS } from "../../../src/types/search";

const mocks = vi.hoisted(() => {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    or: vi.fn(),
    order: vi.fn(),
    limit: vi.fn(),
  };
  return {
    from: vi.fn(),
    apiCall: vi.fn(),
    query,
  };
});

vi.mock("../../../src/lib/supabase", () => ({
  supabase: { from: mocks.from },
}));

vi.mock("../../../src/lib/api", () => ({
  apiCall: mocks.apiCall,
}));

describe("GlobalSearchModal", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.from.mockReturnValue(mocks.query);
    mocks.query.select.mockReturnValue(mocks.query);
    mocks.query.eq.mockReturnValue(mocks.query);
    mocks.query.or.mockReturnValue(mocks.query);
    mocks.query.order.mockReturnValue(mocks.query);
    mocks.query.limit.mockResolvedValue({
      data: [{
        id: "post-1",
        titulo: "Astro search",
        slug: "astro-search",
        body: "A search example",
        imagen_url: null,
        fecha: "2026-10-30T00:00:00.000Z",
        language: "en",
      }],
      error: null,
    });
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    render(null, container);
    document.body.removeChild(container);
  });

  it("opens and closes with Escape", async () => {
    render(<GlobalSearchModal currentLanguage="en" />, container);

    const openButton = container.querySelector("button[aria-label=\"Search\"]") as HTMLButtonElement;
    expect(openButton).toBeTruthy();
    openButton.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    await new Promise((r) => setTimeout(r, 0));

    const backdrop = document.body.querySelector("[data-modal-backdrop]") as HTMLDivElement | null;
    expect(backdrop).toBeTruthy();

    // Wait for keydown listener effect to attach.
    await new Promise((r) => setTimeout(r, 0));

    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

    // Allow effect cleanup.
    await new Promise((r) => setTimeout(r, 0));
    expect(document.body.querySelector("[data-modal-backdrop]")).toBeNull();
  });

  it("uses the Supabase client directly for public search", async () => {
    const filters = { ...DEFAULT_SEARCH_FILTERS("en"), search: "astro" };

    const result = await searchPosts(filters, false);

    expect(mocks.from).toHaveBeenCalledWith("posts");
    expect(mocks.query.select).toHaveBeenCalledWith(
      "id, titulo, slug, body, imagen_url, fecha, language",
    );
    expect(mocks.query.eq).toHaveBeenNthCalledWith(1, "status", "published");
    expect(mocks.query.eq).toHaveBeenNthCalledWith(2, "language", "en");
    expect(mocks.query.or).toHaveBeenCalledWith(
      "titulo.ilike.%astro%,body.ilike.%astro%",
    );
    expect(mocks.apiCall).not.toHaveBeenCalled();
    expect(result.posts).toHaveLength(1);
  });

  it("uses the backend API for admin search", async () => {
    const filters = { ...DEFAULT_SEARCH_FILTERS("en"), search: "draft" };
    mocks.apiCall.mockResolvedValue(new Response(JSON.stringify({
      data: { posts: [], total: 0, limit: 20, offset: 0 },
    }), {
      headers: { "content-type": "application/json" },
    }));

    await searchPosts(filters, true);

    expect(mocks.apiCall).toHaveBeenCalledWith(
      expect.stringContaining("/api/posts/search?"),
      expect.objectContaining({ credentials: "same-origin" }),
    );
    expect(mocks.from).not.toHaveBeenCalled();
  });

  it("does not call Supabase or the backend for queries shorter than two characters", async () => {
    const filters = { ...DEFAULT_SEARCH_FILTERS("en"), search: "a" };

    for (const isAdmin of [false, true]) {
      const result = await searchPosts(filters, isAdmin);
      expect(result.posts).toEqual([]);
    }

    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.apiCall).not.toHaveBeenCalled();
  });
});

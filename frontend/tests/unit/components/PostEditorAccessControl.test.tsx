import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "preact";
import PostEditor from "../../../src/components/admin/PostEditor";
import { getPostEditorLabels, getTagSelectorLabels } from "../../../src/lib/admin-editor";

const useSessionMock = vi.fn();

vi.mock("../../../src/hooks/useSession", () => ({
  useSession: () => useSessionMock(),
}));

describe("PostEditor access control", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
    useSessionMock.mockReset();
  });

  afterEach(() => {
    render(null, container);
    document.body.removeChild(container);
    vi.useRealTimers();
  });

  it("shows sign-in required when user is a guest", () => {
    useSessionMock.mockReturnValue({
      loading: false,
      isAuthenticated: false,
      isAdmin: false,
    });

    render(
      <PostEditor
        mode="create"
        initialData={{ language: "en", titulo: "", slug: "", body: "" }}
        labels={getPostEditorLabels("en")}
        tagLabels={getTagSelectorLabels("en")}
      />,
      container,
    );

    expect(container.textContent).toContain("Sign in required");
    expect(container.textContent).toContain("Sign In");
  });

  it("shows access denied and countdown when user is authenticated but not admin", async () => {
    vi.useFakeTimers();
    const assignSpy = vi.spyOn(window.location, "assign").mockImplementation(() => {});

    useSessionMock.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      isAdmin: false,
    });

    render(
      <PostEditor
        mode="create"
        initialData={{ language: "en", titulo: "", slug: "", body: "" }}
        labels={getPostEditorLabels("en")}
        tagLabels={getTagSelectorLabels("en")}
      />,
      container,
    );

    expect(container.textContent).toContain("Access Denied");
    expect(container.textContent).toContain("Redirecting to homepage in 5 seconds");

    await vi.advanceTimersByTimeAsync(5000);
    expect(assignSpy).toHaveBeenCalledWith("/en/");
  });
});


import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "preact";
import CommentForm from "../../../src/components/comments/CommentForm";
import { t } from "../../../src/lib/i18n";

const useSessionMock = vi.fn();

vi.mock("../../../src/hooks/useSession", () => ({
  useSession: () => useSessionMock(),
}));

describe("CommentForm validation", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
    useSessionMock.mockReset();
  });

  it("shows sign-in prompt when user is not authenticated", () => {
    useSessionMock.mockReturnValue({ user: null, loading: false });
    render(<CommentForm postId="post-1" currentLanguage="en" />, container);
    expect(container.textContent).toContain(
      t("en", "maintenance.authRequiredToComment"),
    );
    expect(container.querySelector("textarea")).toBeNull();
    expect(container.querySelector("a")?.textContent).toBe(
      t("en", "maintenance.signInToContinue"),
    );
  });

  it("disables submit button when content is too short", () => {
    useSessionMock.mockReturnValue({
      user: { id: "user-1", avatar_url: null },
      loading: false,
    });
    render(<CommentForm postId="post-1" />, container);

    const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
    const button = container.querySelector("button[type=\"submit\"]") as HTMLButtonElement;

    textarea.value = "Too short";
    textarea.dispatchEvent(new Event("input", { bubbles: true }));

    expect(button.disabled).toBe(true);
  });
});

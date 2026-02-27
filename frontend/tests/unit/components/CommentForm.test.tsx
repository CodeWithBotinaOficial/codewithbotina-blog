import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render } from "preact";
import CommentForm from "../../../src/components/comments/CommentForm";

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
    render(<CommentForm postId="post-1" />, container);
    expect(container.textContent).toContain("Sign in");
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
